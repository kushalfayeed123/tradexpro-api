// src/auth/dto/login.dto.ts
import { IsString } from 'class-validator';

export class VerifyDTO {
  @IsString()
  userId!: string;

  @IsString()
  code!: string;
}
