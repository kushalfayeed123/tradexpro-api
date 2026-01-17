import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class CreatePlanDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(1)
  min_amount!: number;

  @IsNumber()
  @Min(1)
  max_amount!: number;

  @IsNumber()
  @Min(1)
  duration_days!: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  interest_rate!: number;
}
