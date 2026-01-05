import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MachinesController } from './machines.controller';
import { MachinesService } from './machines.service';
import { Machine } from './entities/machine.entity';
import { TemperatureLog } from './entities/temperature-log.entity';
import { MachineProduct } from '../products/entities/machine-product.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Machine, TemperatureLog, MachineProduct]),
  ],
  controllers: [MachinesController],
  providers: [MachinesService],
  exports: [MachinesService],
})
export class MachinesModule {}