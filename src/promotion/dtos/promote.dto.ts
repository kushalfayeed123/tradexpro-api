import {
  IsString,
  IsEnum,
  IsNumber,
  Min,
  IsOptional,
  IsDateString,
} from 'class-validator';

// promotion.dto.ts
export class CreateCouponDto {
  @IsString()
  code!: string;

  @IsEnum(['flat', 'percentage'])
  discountType!: 'flat' | 'percentage';

  @IsNumber()
  @Min(0)
  discountValue!: number;

  @IsNumber()
  @Min(0)
  minInvestment!: number;

  @IsNumber()
  @Min(1)
  maxUses!: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: Date;
}

export class ValidateCouponDto {
  code!: string;
  amount!: number;
}
