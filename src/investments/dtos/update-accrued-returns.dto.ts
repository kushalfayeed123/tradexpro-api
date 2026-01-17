// src/investments/dto/update-accrued-return.dto.ts
import { IsNumber, IsUUID, Min } from 'class-validator';

export class UpdateAccruedReturnDto {
  @IsUUID()
  investment_id!: string;

  @IsNumber()
  @Min(0)
  accrued_return!: number;
}
