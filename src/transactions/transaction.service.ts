import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as midtransClient from 'midtrans-client';
import { Transaction, TransactionStatus } from './entities/transaction.entity';
import { Product } from '../products/entities/product.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { MidtransNotificationDto } from './dto/midtrans-notification.dto';
import * as crypto from 'crypto';

@Injectable()
export class TransactionService {
  private snap: any;
  private coreApi: any;

  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private configService: ConfigService,
  ) {
    this.snap = new midtransClient.Snap({
      isProduction: this.configService.get<string>('MIDTRANS_IS_PRODUCTION') === 'true',
      serverKey: this.configService.get<string>('MIDTRANS_SERVER_KEY'),
      clientKey: this.configService.get<string>('MIDTRANS_CLIENT_KEY'),
    });

    this.coreApi = new midtransClient.CoreApi({
      isProduction: this.configService.get<string>('MIDTRANS_IS_PRODUCTION') === 'true',
      serverKey: this.configService.get<string>('MIDTRANS_SERVER_KEY'),
      clientKey: this.configService.get<string>('MIDTRANS_CLIENT_KEY'),
    });
  }

  async createTransaction(createTransactionDto: CreateTransactionDto) {
    // Get product with better error handling
    const product = await this.productRepository.findOne({
      where: { id: createTransactionDto.productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${createTransactionDto.productId} not found`);
    }

    // Validate product data
    if (!product.nama || product.nama.trim() === '') {
      throw new BadRequestException('Product name is empty');
    }

    if (!product.harga || product.harga <= 0) {
      throw new BadRequestException('Invalid product price');
    }

    // Check stock
    if (product.stok < createTransactionDto.quantity) {
      throw new BadRequestException(`Insufficient stock. Available: ${product.stok}, Requested: ${createTransactionDto.quantity}`);
    }

    // Calculate amounts
    const unitPrice = Number(product.harga);
    const grossAmount = unitPrice * createTransactionDto.quantity;

    // Validate gross amount
    if (grossAmount < 1) {
      throw new BadRequestException('Total amount must be greater than 0');
    }

    // Generate unique order ID
    const orderId = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Prepare Midtrans parameter
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: grossAmount,
      },
      item_details: [
        {
          id: product.id.toString(),
          price: unitPrice,
          quantity: createTransactionDto.quantity,
          name: product.nama.trim(),
        },
      ],
      customer_details: {
        first_name: createTransactionDto.customerName.trim(),
      },
      enabled_payments: [
        'qris',
        'gopay',
        'shopeepay',
        'bank_transfer',
        'echannel',
        'bca_va',
        'bni_va',
        'bri_va',
        'permata_va',
        'other_va',
      ],
      callbacks: {
        finish: `${this.configService.get('FRONTEND_URL')}/payment/success`,
        error: `${this.configService.get('FRONTEND_URL')}/payment/failed`,
        pending: `${this.configService.get('FRONTEND_URL')}/payment/pending`,
      },
    };

    try {
      console.log('=== Creating Midtrans Transaction ===');
      console.log('Product:', JSON.stringify(product, null, 2));
      console.log('Parameter:', JSON.stringify(parameter, null, 2));
      
      const snapTransaction = await this.snap.createTransaction(parameter);

      console.log('Snap Response:', JSON.stringify(snapTransaction, null, 2));

      // Save transaction to database
      const transaction = this.transactionRepository.create({
        orderId,
        productId: product.id,
        quantity: createTransactionDto.quantity,
        grossAmount,
        status: TransactionStatus.PENDING,
        snapToken: snapTransaction.token,
        snapUrl: snapTransaction.redirect_url,
        customerName: createTransactionDto.customerName,
        platform: createTransactionDto.platform || 'web',
        midtransResponse: JSON.stringify(snapTransaction),
      });

      await this.transactionRepository.save(transaction);

      return {
        success: true,
        orderId: transaction.orderId,
        snapToken: snapTransaction.token,
        snapUrl: snapTransaction.redirect_url,
        grossAmount: transaction.grossAmount,
        product: {
          id: product.id,
          nama: product.nama,
          harga: product.harga,
          gambar: product.gambar,
        },
        message: 'Transaction created successfully',
      };
    } catch (error) {
      console.error('=== Midtrans Error ===');
      console.error('Error:', error);
      console.error('Parameter sent:', JSON.stringify(parameter, null, 2));
      
      if (error.ApiResponse) {
        throw new BadRequestException({
          message: 'Midtrans API Error',
          errors: error.ApiResponse.error_messages,
          details: error.ApiResponse,
        });
      }
      
      throw new BadRequestException('Failed to create payment transaction: ' + error.message);
    }
  }

  /**
   * Update product stock when payment is successful
   */
  private async updateProductStock(transaction: Transaction): Promise<void> {
    try {
      const product = await this.productRepository.findOne({
        where: { id: transaction.productId },
      });

      if (!product) {
        console.error(`❌ Product with ID ${transaction.productId} not found for stock update`);
        return;
      }

      // Validate stock availability
      if (product.stok < transaction.quantity) {
        console.error(
          `❌ Insufficient stock for product ${product.id}. Available: ${product.stok}, Required: ${transaction.quantity}`
        );
        return;
      }

      // Decrease stock
      product.stok -= transaction.quantity;
      
      await this.productRepository.save(product);

      console.log(
        `✅ Stock updated for product ${product.nama}. Sold: ${transaction.quantity}, Remaining: ${product.stok}`
      );
    } catch (error) {
      console.error('❌ Error updating product stock:', error);
      // Don't throw error to prevent transaction from failing
    }
  }

  async handleNotification(notification: MidtransNotificationDto) {
    const { order_id, transaction_status, fraud_status } = notification;

    // Verify signature
    const isValid = this.verifySignature(notification);
    if (!isValid) {
      throw new BadRequestException('Invalid signature');
    }

    const transaction = await this.transactionRepository.findOne({
      where: { orderId: order_id },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Store previous status to check if status changed to success
    const previousStatus = transaction.status;
    let status: TransactionStatus;

    if (transaction_status === 'capture') {
      if (fraud_status === 'accept') {
        status = TransactionStatus.SUCCESS;
        transaction.paidAt = new Date();
      } else {
        status = TransactionStatus.FAILED;
      }
    } else if (transaction_status === 'settlement') {
      status = TransactionStatus.SUCCESS;
      transaction.paidAt = new Date();
    } else if (transaction_status === 'pending') {
      status = TransactionStatus.PENDING;
    } else if (transaction_status === 'deny' || transaction_status === 'cancel') {
      status = TransactionStatus.CANCELLED;
    } else if (transaction_status === 'expire') {
      status = TransactionStatus.EXPIRED;
    } else {
      status = TransactionStatus.FAILED;
    }

    transaction.status = status;
    transaction.transactionId = notification.transaction_id;
    transaction.paymentType = notification.payment_type;
    transaction.midtransResponse = JSON.stringify(notification);

    await this.transactionRepository.save(transaction);

    // Update stock if payment just became successful
    if (
      status === TransactionStatus.SUCCESS &&
      previousStatus !== TransactionStatus.SUCCESS
    ) {
      console.log(`🔄 Payment successful for order ${order_id}. Updating stock...`);
      await this.updateProductStock(transaction);
    }

    return {
      message: 'Notification processed successfully',
      orderId: order_id,
      status,
    };
  }

  async checkStatus(orderId: string) {
    try {
      const statusResponse = await this.coreApi.transaction.status(orderId);

      const transaction = await this.transactionRepository.findOne({
        where: { orderId },
        relations: ['product'],
      });

      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }

      // Store previous status to check if status changed
      const previousStatus = transaction.status;
      let status: TransactionStatus;
      
      if (statusResponse.transaction_status === 'settlement') {
        status = TransactionStatus.SUCCESS;
        if (!transaction.paidAt) {
          transaction.paidAt = new Date();
        }
      } else if (statusResponse.transaction_status === 'pending') {
        status = TransactionStatus.PENDING;
      } else if (statusResponse.transaction_status === 'expire') {
        status = TransactionStatus.EXPIRED;
      } else if (statusResponse.transaction_status === 'cancel' || statusResponse.transaction_status === 'deny') {
        status = TransactionStatus.CANCELLED;
      } else {
        status = TransactionStatus.FAILED;
      }

      if (transaction.status !== status) {
        transaction.status = status;
        transaction.transactionId = statusResponse.transaction_id;
        transaction.paymentType = statusResponse.payment_type;
        await this.transactionRepository.save(transaction);

        // Update stock if payment just became successful
        if (
          status === TransactionStatus.SUCCESS &&
          previousStatus !== TransactionStatus.SUCCESS
        ) {
          console.log(`🔄 Payment successful for order ${orderId}. Updating stock...`);
          await this.updateProductStock(transaction);
        }
      }

      return {
        orderId: transaction.orderId,
        status: transaction.status,
        transactionId: transaction.transactionId,
        paymentType: transaction.paymentType,
        grossAmount: transaction.grossAmount,
        paidAt: transaction.paidAt,
        product: transaction.product,
        customer: {
          name: transaction.customerName,
        },
        midtransStatus: statusResponse,
      };
    } catch (error) {
      console.error('Check status error:', error);
      throw new BadRequestException('Failed to check transaction status: ' + error.message);
    }
  }

  async getAllTransactions() {
    return await this.transactionRepository.find({
      relations: ['product'],
      order: { createdAt: 'DESC' },
    });
  }

  async getTransactionByOrderId(orderId: string) {
    const transaction = await this.transactionRepository.findOne({
      where: { orderId },
      relations: ['product'],
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  private verifySignature(notification: MidtransNotificationDto): boolean {
    const { order_id, status_code, gross_amount, signature_key } = notification;
    const serverKey = this.configService.get<string>('MIDTRANS_SERVER_KEY');
    
    const hash = crypto
      .createHash('sha512')
      .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
      .digest('hex');

    return hash === signature_key;
  }

  async cancelTransaction(orderId: string) {
    try {
      const transaction = await this.transactionRepository.findOne({
        where: { orderId },
      });

      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }

      if (transaction.status !== TransactionStatus.PENDING) {
        throw new BadRequestException('Only pending transactions can be cancelled');
      }

      await this.coreApi.transaction.cancel(orderId);

      transaction.status = TransactionStatus.CANCELLED;
      await this.transactionRepository.save(transaction);

      return {
        message: 'Transaction cancelled successfully',
        orderId,
      };
    } catch (error) {
      console.error('Cancel transaction error:', error);
      throw new BadRequestException('Failed to cancel transaction: ' + error.message);
    }
  }
}