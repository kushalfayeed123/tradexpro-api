/* eslint-disable @typescript-eslint/no-unsafe-member-access */
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
    // 1. Create plan
    const { data: plan, error: planError } = await this.supabase
      .from('investment_plans')
      .insert(dto)
      .select()
      .single();

    if (planError) {
      throw new BadRequestException(planError.message);
    }

    // 2. Create ledger account (system default currency)
    const { data: ledgerAccount, error: ledgerError } = await this.supabase
      .from('ledger_accounts')
      .insert({
        owner_type: 'investment_plan',
        owner_id: plan.id,
        currency: 'USD',
        name: plan.name, // 🔒 enforced default
      })
      .select()
      .single();

    if (ledgerError) {
      throw new BadRequestException(ledgerError.message);
    }

    // 3. Link ledger account to plan
    const { error: updateError } = await this.supabase
      .from('investment_plans')
      .update({ ledger_account_id: ledgerAccount.id })
      .eq('id', plan.id);

    if (updateError) {
      throw new BadRequestException(updateError.message);
    }

    return {
      ...plan,
      ledger_account_id: ledgerAccount.id,
    };
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
