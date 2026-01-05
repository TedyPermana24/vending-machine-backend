import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { MachineProduct } from './entities/machine-product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
    @InjectRepository(MachineProduct)
    private machineProductsRepository: Repository<MachineProduct>,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const product = this.productsRepository.create(createProductDto);
    return await this.productsRepository.save(product);
  }

  async findAll(): Promise<Product[]> {
    return await this.productsRepository.find({
      relations: ['machineProducts', 'machineProducts.machine'],
    });
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { id },
      relations: ['machineProducts', 'machineProducts.machine'],
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async findByMachine(machineId: number): Promise<MachineProduct[]> {
    return await this.machineProductsRepository.find({
      where: { machineId },
      relations: ['product'],
    });
  }

  async setMachineStock(
    productId: number,
    machineId: number,
    stok: number,
  ): Promise<MachineProduct> {
    // Cek apakah product dan machine exist
    const product = await this.findOne(productId);

    let machineProduct = await this.machineProductsRepository.findOne({
      where: { productId, machineId },
    });

    if (machineProduct) {
      machineProduct.stok = stok;
    } else {
      machineProduct = this.machineProductsRepository.create({
        productId,
        machineId,
        stok,
      });
    }

    return await this.machineProductsRepository.save(machineProduct);
  }

  async updateMachineStock(
    productId: number,
    machineId: number,
    stokChange: number,
  ): Promise<MachineProduct> {
    const machineProduct = await this.machineProductsRepository.findOne({
      where: { productId, machineId },
    });

    if (!machineProduct) {
      throw new NotFoundException(
        `Product ${productId} not found in machine ${machineId}`,
      );
    }

    machineProduct.stok += stokChange;
    if (machineProduct.stok < 0) {
      machineProduct.stok = 0;
    }

    return await this.machineProductsRepository.save(machineProduct);
  }

  async getMachineStock(
    productId: number,
    machineId: number,
  ): Promise<number> {
    const machineProduct = await this.machineProductsRepository.findOne({
      where: { productId, machineId },
    });

    return machineProduct ? machineProduct.stok : 0;
  }

  async update(
    id: number,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.findOne(id);
    Object.assign(product, updateProductDto);
    return await this.productsRepository.save(product);
  }

  async remove(id: number): Promise<void> {
    const product = await this.findOne(id);
    await this.productsRepository.remove(product);
  }
}
