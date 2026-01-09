import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as midtransClient from 'midtrans-client';
import { Transaction, TransactionStatus } from './entities/transaction.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { Machine } from '../machines/entities/machine.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { MidtransNotificationDto } from './dto/midtrans-notification.dto';
import { ProductsService } from '../products/products.service';
import { MqttService } from '../mqtt/mqtt.service';
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
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Machine)
    private machineRepository: Repository<Machine>,
    private configService: ConfigService,
    private productsService: ProductsService,
    private mqttService: MqttService,
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

  async createTransaction(createTransactionDto: CreateTransactionDto, userId: number) {
    // Validate input
    if (!createTransactionDto) {
      throw new BadRequestException('Request body is required');
    }

    const { productId, quantity = 1, machineId, platform = 'web' } = createTransactionDto;

    // Validate required fields
    if (!productId) {
      throw new BadRequestException('productId is required');
    }
    if (!machineId) {
      throw new BadRequestException('machineId is required');
    }

    // Get product
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Validate product
    if (!product.name || product.name.trim() === '') {
      throw new BadRequestException('Product name is empty');
    }

    if (!product.harga || product.harga <= 0) {
      throw new BadRequestException('Invalid product price');
    }

    // Validate machine (WAJIB)
    const machine = await this.machineRepository.findOne({
      where: { id: machineId },
    });

    if (!machine) {
      throw new NotFoundException(`Machine with ID ${machineId} not found`);
    }

    if (machine.status !== 'online') {
      throw new BadRequestException(`Machine ${machine.name} is not online`);
    }

    // Check stock per machine
    const availableStock = await this.productsService.getMachineStock(productId, machineId);
    if (availableStock < quantity) {
      throw new BadRequestException(`Insufficient stock. Available: ${availableStock}, Requested: ${quantity}`);
    }

    // Get user
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Calculate amounts
    const unitPrice = Number(product.harga);
    const grossAmount = unitPrice * quantity;

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
          quantity: quantity,
          name: product.name.trim(),
        },
      ],
      customer_details: {
        first_name: user.name,
        email: user.email,
        phone: user.phone,
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
      console.log('Parameter:', JSON.stringify(parameter, null, 2));
      
      const snapTransaction = await this.snap.createTransaction(parameter);

      console.log('Snap Response:', JSON.stringify(snapTransaction, null, 2));

      // Save transaction to database
      const transaction = this.transactionRepository.create({
        orderId: orderId,
        productId: product.id,
        userId: user.id,
        machineId: machineId, // Langsung assign, tidak perlu || null
        quantity: quantity,
        grossAmount: grossAmount,
        status: TransactionStatus.PENDING,
        snapToken: snapTransaction.token,
        snapUrl: snapTransaction.redirect_url,
        platform: platform,
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
          nama: product.name,
          harga: product.harga,
          gambar: product.gambar,
        },
        machine: {
          id: machine.id,
          name: machine.name,
          location: machine.location,
        },
        message: 'Transaction created successfully',
      };
    } catch (error) {
      console.error('=== Midtrans Error ===');
      console.error('Error:', error);
      
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

  private async updateProductStock(transaction: Transaction): Promise<void> {
    try {
      const product = await this.productRepository.findOne({
        where: { id: transaction.productId },
      });

      if (!product) {
        console.error(`❌ Product with ID ${transaction.productId} not found for stock update`);
        return;
      }

      // Check stock per machine
      const availableStock = await this.productsService.getMachineStock(
        transaction.productId,
        transaction.machineId
      );

      if (availableStock < transaction.quantity) {
        console.error(
          `❌ Insufficient stock for product ${product.id}. Available: ${availableStock}, Required: ${transaction.quantity}`
        );
        return;
      }

      // Update stock per machine (decrease)
      await this.productsService.updateMachineStock(
        transaction.productId,
        transaction.machineId,
        -transaction.quantity
      );

      const remainingStock = await this.productsService.getMachineStock(
        transaction.productId,
        transaction.machineId
      );

      console.log(
        `✅ Stock updated for product ${product.name}. Sold: ${transaction.quantity}, Remaining: ${remainingStock}`
      );

      // Trigger dispense command via MQTT
      const machine = await this.machineRepository.findOne({
        where: { id: transaction.machineId },
      });

      if (machine) {
        try {
          await this.mqttService.publishDispenseCommand(
            machine.code,
            transaction.productId,
            transaction.quantity
          );
          console.log(`🎁 Dispense triggered for Product ${transaction.productId} on ${machine.name}`);
        } catch (dispenseError) {
          console.error(`❌ Failed to trigger dispense:`, dispenseError);
        }
      }
    } catch (error) {
      console.error('❌ Error updating product stock:', error);
    }
  }

  async handleNotification(notification: MidtransNotificationDto) {
    const { order_id, transaction_status, fraud_status } = notification;

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
        relations: ['product', 'user', 'machine'],
      });

      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }

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
        machine: transaction.machine,
        customer: transaction.user ? {
          name: transaction.user.name,
          email: transaction.user.email,
          phone: transaction.user.phone,
        } : null,
        midtransStatus: statusResponse,
      };
    } catch (error) {
      console.error('Check status error:', error);
      throw new BadRequestException('Failed to check transaction status: ' + error.message);
    }
  }

  async getAllTransactions() {
    return await this.transactionRepository.find({
      relations: ['product', 'user', 'machine'],
      order: { createdAt: 'DESC' },
    });
  }

  async getTransactionByOrderId(orderId: string) {
    const transaction = await this.transactionRepository.findOne({
      where: { orderId },
      relations: ['product', 'user', 'machine'],
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  async getUserTransactionHistory(userId: number) {
    const transactions = await this.transactionRepository.find({
      where: { userId },
      relations: ['product', 'machine'],
      order: { createdAt: 'DESC' },
    });

    return transactions.map(transaction => ({
      id: transaction.id,
      orderId: transaction.orderId,
      product: {
        id: transaction.product.id,
        nama: transaction.product.name,
        harga: transaction.product.harga,
        gambar: transaction.product.gambar,
      },
      machine: transaction.machine ? {
        id: transaction.machine.id,
        name: transaction.machine.name,
        location: transaction.machine.location,
      } : null,
      quantity: transaction.quantity,
      grossAmount: transaction.grossAmount,
      status: transaction.status,
      paymentType: transaction.paymentType,
      platform: transaction.platform,
      createdAt: transaction.createdAt,
      paidAt: transaction.paidAt,
    }));
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