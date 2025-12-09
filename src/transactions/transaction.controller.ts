import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { MidtransNotificationDto } from './dto/midtrans-notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('payments')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  async createTransaction(
    @Body() createTransactionDto: CreateTransactionDto,
    @Request() req: any,
  ) {
    const userId = req.user.sub;
    return await this.transactionService.createTransaction(createTransactionDto, userId);
  }

  @Post('notification')
  @HttpCode(HttpStatus.OK)
  async handleNotification(@Body() notification: MidtransNotificationDto) {
    return await this.transactionService.handleNotification(notification);
  }

  @Get('status/:orderId')
  async checkStatus(@Param('orderId') orderId: string) {
    return await this.transactionService.checkStatus(orderId);
  }

  @Get('transactions')
  async getAllTransactions() {
    return await this.transactionService.getAllTransactions();
  }

  @Get('my-history')
  @UseGuards(JwtAuthGuard)
  async getMyTransactionHistory(@Request() req: any) {
    const userId = req.user.sub;
    return await this.transactionService.getUserTransactionHistory(userId);
  }

  @Get('transaction/:orderId')
  async getTransaction(@Param('orderId') orderId: string) {
    return await this.transactionService.getTransactionByOrderId(orderId);
  }

  @Post('cancel/:orderId')
  async cancelTransaction(@Param('orderId') orderId: string) {
    return await this.transactionService.cancelTransaction(orderId);
  }
}
