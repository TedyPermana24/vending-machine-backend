import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Machine } from './machine.entity';

@Entity('temperature_logs')
export class TemperatureLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  machineId: number;

  @ManyToOne(() => Machine)
  @JoinColumn({ name: 'machineId' })
  machine: Machine;

  @Column('decimal', { precision: 5, scale: 2 })
  temperature: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  humidity: number;

  @CreateDateColumn()
  createdAt: Date;
}