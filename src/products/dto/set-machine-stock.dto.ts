import { IsNumber, Min } from 'class-validator';

export class SetMachineStockDto {
  @IsNumber()
  @Min(0)
  stok: number;
}
