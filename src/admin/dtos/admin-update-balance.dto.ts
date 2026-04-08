import {
  IsUUID,
  IsNumber,
  IsString,
  IsNotEmpty,
  MinLength,
} from 'class-validator';

export class AdminUpdateBalanceDto {
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @IsNumber()
  @IsNotEmpty()
  amount!: number; // e.g., 500 to add, -500 to subtract

  @IsString()
  description: string; // Force a reason for the audit trail
}
