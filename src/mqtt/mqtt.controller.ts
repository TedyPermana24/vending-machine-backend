import { Controller, Post, Body, Get, UseGuards, Param } from '@nestjs/common';
import { MqttService } from './mqtt.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

class PublishMessageDto {
  topic: string;
  message: any;
}

class DispenseCommandDto {
  machineCode: string;
  productId: number;
  quantity: number;
}

@Controller('mqtt')
@UseGuards(JwtAuthGuard, AdminGuard)
export class MqttController {
  constructor(private readonly mqttService: MqttService) {}

  @Get('status')
  getStatus() {
    return {
      connected: this.mqttService.isConnected(),
      message: this.mqttService.isConnected() ? 'MQTT broker connected' : 'MQTT broker disconnected',
    };
  }

  @Post('publish')
  async publish(@Body() dto: PublishMessageDto) {
    await this.mqttService.publish(dto.topic, dto.message);
    return {
      success: true,
      message: 'Message published successfully',
      topic: dto.topic,
    };
  }

  @Post('dispense')
  async dispense(@Body() dto: DispenseCommandDto) {
    await this.mqttService.publishDispenseCommand(
      dto.machineCode,
      dto.productId
    );
    return {
      success: true,
      message: 'Dispense command sent successfully',
      machineCode: dto.machineCode,
      productId: dto.productId,
      quantity: dto.quantity,
    };
  }

  @Post('subscribe/:topic')
  async subscribe(@Param('topic') topic: string) {
    await this.mqttService.subscribe(topic);
    return {
      success: true,
      message: 'Subscribed successfully',
      topic,
    };
  }
}