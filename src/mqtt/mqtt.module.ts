import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MqttService } from './mqtt.service';
import { MqttController } from './mqtt.controller';
import { MachineGateway } from '../machine.gateway';
import { Machine } from '../machines/entities/machine.entity';
import { TemperatureLog } from '../machines/entities/temperature-log.entity';
import { MachinesModule } from '../machines/machines.module';

@Global()
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Machine, TemperatureLog]),
    MachinesModule,
  ],
  controllers: [MqttController],
  providers: [MqttService, MachineGateway],
  exports: [MqttService, MachineGateway],
})
export class MqttModule {}