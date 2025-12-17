import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class CreateTransactionDto {
  @IsNumber()
  productId: number;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  machineId: number; // Hapus @IsOptional()

  @IsString()
  @IsOptional()
  platform?: string;
}