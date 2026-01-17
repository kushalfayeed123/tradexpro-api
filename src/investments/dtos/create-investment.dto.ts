import { IsUUID, IsNumber, Min } from 'class-validator';

export class CreateInvestmentDto {
  @IsUUID()
  plan_id!: string;

  @IsNumber()
  @Min(1)
  amount!: number;

  @IsUUID()
  wallet_id!: string;
}
