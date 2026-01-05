import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Put,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SetMachineStockDto } from './dto/set-machine-stock.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(+id, updateProductDto);
  }
  
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.productsService.remove(+id);
  }

  // Machine-specific stock endpoints
  @Get('machine/:machineId')
  findByMachine(@Param('machineId') machineId: string) {
    return this.productsService.findByMachine(+machineId);
  }

  @Put(':id/machine/:machineId/stock')
  setMachineStock(
    @Param('id') id: string,
    @Param('machineId') machineId: string,
    @Body() setMachineStockDto: SetMachineStockDto,
  ) {
    return this.productsService.setMachineStock(
      +id,
      +machineId,
      setMachineStockDto.stok,
    );
  }

  @Get(':id/machine/:machineId/stock')
  getMachineStock(
    @Param('id') id: string,
    @Param('machineId') machineId: string,
  ) {
    return this.productsService.getMachineStock(+id, +machineId);
  }
}
