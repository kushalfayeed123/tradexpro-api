// src/deposit-methods/dto/create-deposit-method.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateDepositMethodDto {
  @IsString()
  @IsNotEmpty()
  asset_name!: string;

  @IsString()
  @IsOptional()
  network!: string;

  @IsString()
  @IsNotEmpty()
  wallet_address!: string;

  @IsString()
  @IsOptional()
  instructions!: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
