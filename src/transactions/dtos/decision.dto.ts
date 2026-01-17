// src/transactions/dto/decision.dto.ts
import { IsIn } from 'class-validator';

export class TransactionDecisionDto {
  @IsIn(['approved', 'rejected'])
  status!: 'approved' | 'rejected';
}
