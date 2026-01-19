// src/kyc/dto/review-kyc.dto.ts
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum KycDecision {
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export class ReviewKycDto {
  @IsEnum(KycDecision)
  decision!: KycDecision;

  @IsOptional()
  @IsString()
  rejection_reason?: string;
}
