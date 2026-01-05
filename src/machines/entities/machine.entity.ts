import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { MachineProduct } from '../../products/entities/machine-product.entity';

export enum MachineStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  MAINTENANCE = 'maintenance',
}

@Entity('machines')
export class Machine {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column()
  location: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude?: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude?: number;

  @Column({ unique: true })
  mqttTopic: string;

  @Column({
    type: 'enum',
    enum: MachineStatus,
    default: MachineStatus.OFFLINE,
  })
  status: MachineStatus;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  currentTemperature?: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  currentHumidity?: number;

  @Column({ type: 'timestamp', nullable: true })
  lastOnline?: Date;

  @OneToMany('Transaction', 'machine')
  transactions: any[];

  @OneToMany('TemperatureLog', 'machine')
  temperatureLogs: any[];

  @OneToMany(() => MachineProduct, (machineProduct) => machineProduct.machine)
  machineProducts: MachineProduct[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}