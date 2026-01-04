// Run this script to seed products for expert system
// Execute: npm run ts-node src/seed-products.ts

import { DataSource } from 'typeorm';
import { Product } from './products/entities/product.entity';

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'jamuin_db',
  entities: [Product],
  synchronize: false,
});

async function seedProducts() {
  await AppDataSource.initialize();
  console.log('Database connected');

  const productRepository = AppDataSource.getRepository(Product);

  const products = [
    {
      id: 1,
      nama: 'Jamu Kunyit Asam',
      deskripsi: 'Jamu tradisional untuk kesehatan wanita',
      manfaat: 'Meredakan nyeri haid, melancarkan pencernaan, membantu kontrol gula darah',
      harga: 15000,
      stok: 50,
    },
    {
      id: 2,
      nama: 'Jamu Beras Kencur',
      deskripsi: 'Jamu penambah nafsu makan dan stamina',
      manfaat: 'Meningkatkan daya tahan tubuh, menambah nafsu makan, meredakan masalah pernapasan',
      harga: 12000,
      stok: 50,
    },
    {
      id: 3,
      nama: 'Sari Temulawak Deli',
      deskripsi: 'Minuman herbal untuk kesehatan liver',
      manfaat: 'Menjaga kesehatan hati, melancarkan pencernaan, meningkatkan nafsu makan',
      harga: 18000,
      stok: 50,
    },
    {
      id: 4,
      nama: 'KukuBima TL Herbal Sidomuncul',
      deskripsi: 'Minuman herbal energi dan antioksidan',
      manfaat: 'Meningkatkan stamina, sumber antioksidan, menjaga kesehatan tubuh',
      harga: 8000,
      stok: 50,
    },
  ];

  for (const productData of products) {
    let product = await productRepository.findOne({
      where: { id: productData.id },
    });

    if (product) {
      console.log(`Updating product ${productData.id}: ${productData.nama}`);
      await productRepository.update(product.id, productData);
    } else {
      console.log(`Creating product ${productData.id}: ${productData.nama}`);
      product = productRepository.create(productData);
      await productRepository.save(product);
    }
  }

  console.log('✅ All products seeded successfully!');
  await AppDataSource.destroy();
}

seedProducts().catch((error) => {
  console.error('Error seeding products:', error);
  process.exit(1);
});
