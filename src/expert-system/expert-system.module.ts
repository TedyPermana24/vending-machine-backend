import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ExpertSystemController } from './expert-system.controller';
import { ExpertSystemService } from './expert-system.service';
import { Product } from '../products/entities/product.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product]),
    ConfigModule,
  ],
  controllers: [ExpertSystemController],
  providers: [ExpertSystemService],
  exports: [ExpertSystemService],
})
export class ExpertSystemModule {}
