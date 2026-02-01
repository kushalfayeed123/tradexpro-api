import { IsString, IsNumber, IsOptional, Min, IsEnum } from 'class-validator';

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
  interest_rate!: number;

  @IsOptional()
  @IsEnum(['active', 'inactive'], {
    message: 'Status must be either active or inactive',
  })
  status?: string;
}
