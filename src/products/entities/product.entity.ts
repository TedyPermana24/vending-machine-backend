import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { MachineProduct } from './machine-product.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'text' })
  deskripsi: string;

  @Column({ type: 'text' })
  manfaat: string;

  @Column({ type: 'int' }) // Ubah dari decimal ke int (dalam Rupiah)
  harga: number;

  @Column({ nullable: true })
  gambar: string;

  @OneToMany(() => MachineProduct, (machineProduct) => machineProduct.product)
  machineProducts: MachineProduct[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
