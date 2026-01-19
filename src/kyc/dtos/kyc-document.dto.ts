// src/kyc/dto/kyc-document.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class KycDocumentDto {
  @IsString()
  document_type!: string; // passport, id_card, utility_bill

  @IsString()
  document_url!: string;

  @IsOptional()
  @IsString()
  document_number?: string;

  @IsOptional()
  @IsString()
  issued_country?: string;
}
