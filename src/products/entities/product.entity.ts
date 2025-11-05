import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nama: string;

  @Column({ type: 'text' })
  deskripsi: string;

  @Column({ type: 'text' })
  manfaat: string;

  @Column({ type: 'int' }) // Ubah dari decimal ke int (dalam Rupiah)
  harga: number;

  @Column()
  stok: number;

  @Column({ nullable: true })
  gambar: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
