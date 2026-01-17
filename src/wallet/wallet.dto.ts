// src/wallets/dto/create-wallet.dto.ts
import { IsIn, IsString } from 'class-validator';

export class CreateWalletDto {
  @IsString()
  @IsIn(['USD', 'EUR'])
  currency!: string;
}
