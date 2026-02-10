import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsPhoneNumber,
} from 'class-validator';

export class RegisterDto {
  /* =========================
      AUTH
  ========================= */

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(64)
  password!: string;

  /* =========================
      PROFILE
  ========================= */

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName!: string;

  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(56)
  country?: string;

  /* =========================
      REFERRAL
  ========================= */

  @IsOptional()
  @IsString()
  referralCode?: string;
}
