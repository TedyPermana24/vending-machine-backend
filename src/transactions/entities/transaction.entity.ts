import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { User } from '../../users/entities/user.entity';

export enum TransactionStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  orderId: string;

  @Column()
  userId: number;

  @ManyToOne(() => User, (user) => user.transactions)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  productId: number;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column()
  machineId: number;

  @ManyToOne('Machine', 'transactions')
  @JoinColumn({ name: 'machineId' })
  machine: any;

  @Column({ default: 1 })
  quantity: number;

  @Column({ nullable: true })
  transactionId?: string;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({ nullable: true })
  transactionStatus?: string;

  @Column({ nullable: true })
  paymentType?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  grossAmount: number;

  @Column({ type: 'timestamp', nullable: true })
  paidAt?: Date;

  @Column({ type: 'text', nullable: true })
  snapToken?: string;

  @Column({ type: 'text', nullable: true })
  snapUrl?: string;

  @Column({ default: 'web' })
  platform: string;

  @Column({ type: 'json', nullable: true })
  midtransResponse?: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}