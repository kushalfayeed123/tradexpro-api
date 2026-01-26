import {
  IsEnum,
  IsNumber,
  IsString,
  IsOptional,
  IsUUID,
} from 'class-validator';

export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  INVESTMENT = 'investment',
  RETURN = 'return',
  FEE = 'fee',
  ADJUSTMENT = 'adjustment',
}

export class CreateTransactionDto {
  @IsNumber()
  amount!: number;

  @IsEnum(TransactionType)
  type!: TransactionType;

  @IsString()
  reference!: string;

  @IsUUID()
  wallet_id!: string; // The internal ledger account ID

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  sender_address?: string; // Source

  @IsString()
  @IsOptional()
  beneficiary_address?: string; // Destination

  @IsString()
  @IsOptional()
  txn_hash?: string; // External Reference/Hash

  @IsString()
  @IsOptional()
  payment_method?: string;

  @IsString()
  @IsOptional()
  receipt_url?: string;
}
