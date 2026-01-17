// src/transactions/dto/create-transaction.dto.ts
import { IsEnum, IsNumber, IsString, IsUUID } from 'class-validator';

export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  INVESTMENT = 'investment',
  RETURN = 'return',
  FEE = 'fee',
  ADJUSTMENT = 'adjustment',
}

export class CreateTransactionDto {
  @IsEnum(TransactionType)
  type!: TransactionType;

  @IsNumber()
  amount!: number;

  @IsUUID()
  wallet_id!: string;

  @IsString()
  reference!: string;

  @IsString()
  description!: string;
}
