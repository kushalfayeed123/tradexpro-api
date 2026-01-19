// src/kyc/dto/submit-kyc.dto.ts
import { IsArray, IsInt, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { KycDocumentDto } from './kyc-document.dto';

export class SubmitKycDto {
  @IsUUID()
  kyc_id!: string;

  @IsInt()
  level!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KycDocumentDto)
  documents!: KycDocumentDto[];
}
