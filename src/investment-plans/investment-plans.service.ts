/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { CreatePlanDto } from './dtos/create-plan.dto';
import { UpdatePlanDto } from './dtos/update-plan.dto';

@Injectable()
export class InvestmentPlansService {
  constructor(@Inject('SUPABASE_CLIENT') private supabase: SupabaseClient) {}

  async create(dto: CreatePlanDto) {
    const { data, error } = await this.supabase
      .from('investment_plans')
      .insert(dto)
      .select()
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async update(id: string, dto: UpdatePlanDto) {
    const { data, error } = await this.supabase
      .from('investment_plans')
      .update(dto)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async findAll() {
    const { data, error } = await this.supabase
      .from('investment_plans')
      .select('*')
      .eq('status', 'active');
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase
      .from('investment_plans')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    return data;
  }
}
