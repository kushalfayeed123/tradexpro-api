/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { LedgerService } from '../ledger/ledger.service';
import { CreateInvestmentDto } from './dtos/create-investment.dto';

@Injectable()
export class InvestmentsService {
  constructor(
    @Inject('SUPABASE_CLIENT') private supabase: SupabaseClient,
    private ledger: LedgerService,
  ) {}

  async create(userId: string, dto: CreateInvestmentDto) {
    // 1. Get plan
    const { data: plan, error: planError } = await this.supabase
      .from('investment_plans')
      .select('*')
      .eq('id', dto.plan_id)
      .maybeSingle();
    if (planError || !plan) throw new BadRequestException('Plan not found');

    if (dto.amount < plan.min_amount || dto.amount > plan.max_amount)
      throw new BadRequestException('Amount not within plan limits');

    // 2. Ledger: Debit user, Credit investment pool
    await this.ledger.transfer(
      `INV-${userId}-${Date.now()}`,
      dto.wallet_id,
      plan.id, // investment pool account
      dto.amount,
    );

    // 3. Create investment record
    const { data, error } = await this.supabase
      .from('investments')
      .insert({
        user_id: userId,
        plan_id: dto.plan_id,
        wallet_id: dto.wallet_id,
        principal: dto.amount,
        status: 'active',
        start_date: new Date(),
        end_date: new Date(
          Date.now() + plan.duration_days * 24 * 60 * 60 * 1000,
        ),
      })
      .select()
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async findUserInvestments(userId: string) {
    const { data, error } = await this.supabase
      .from('investments')
      .select(
        `
        *,
        plan:investment_plans!inner (
          name,
          description,
          interest_rate,
          duration_days
        )
      `,
      )
      .eq('user_id', userId);
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase
      .from('investments')
      .select(
        `
        *,
        plan:investment_plans!inner (
          name,
          description,
          interest_rate,
          duration_days
        )
      `,
      )
      .eq('id', id)
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async matureInvestment(adminId: string, investmentId: string) {
    // Logic to calculate returns and ledger transfer (debit investment pool, credit user wallet)
    // Then update investment.status = 'matured'
    // Similar to transactions approve flow
  }
}
