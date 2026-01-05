import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from './product.entity';
import { Machine } from '../../machines/entities/machine.entity';

@Entity('machine_products')
export class MachineProduct {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  machineId: number;

  @Column()
  productId: number;

  @Column({ default: 0 })
  stok: number;

  @ManyToOne(() => Machine, (machine) => machine.machineProducts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'machineId' })
  machine: Machine;

  @ManyToOne(() => Product, (product) => product.machineProducts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
