/* eslint-disable @typescript-eslint/no-unsafe-argument */

/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { LedgerService } from '../ledger/ledger.service';
import { CreateInvestmentDto } from './dtos/create-investment.dto';
import { UpdateAccruedReturnDto } from './dtos/update-accrued-returns.dto';
import { PromotionService } from 'src/promotion/promotion.service';

@Injectable()
export class InvestmentsService {
  constructor(
    @Inject('SUPABASE_CLIENT') private supabase: SupabaseClient,
    private ledger: LedgerService,
    private promotionService: PromotionService,
  ) {}

  async create(userId: string, dto: CreateInvestmentDto) {
    // 1. Get plan
    const { data: plan } = await this.supabase
      .from('investment_plans')
      .select('*')
      .eq('id', dto.plan_id)
      .single();

    if (!plan) throw new BadRequestException('Plan not found');

    if (dto.amount < plan.min_amount || dto.amount > plan.max_amount) {
      throw new BadRequestException('Amount not within plan limits');
    }

    // 2. User wallet ledger account
    const userWallet = await this.ledger.getUserWalletAccount(userId);
    if (!userWallet) throw new BadRequestException('User wallet not found');

    const { data: transaction, error: txError } = await this.supabase
      .from('transactions')
      .insert({
        wallet_id: dto.wallet_id,
        amount: dto.amount,
        created_by: userId,
        type: 'investment',
        status: 'approved',
        reference: `INV-${Date.now()}`,
        description: 'Investment funding',
      })
      .select()
      .single();

    if (txError || !transaction)
      throw new BadRequestException('Failed to create transaction');

    // 3. Create ledger account for the investment FIRST
    const { data: investmentLedger, error: ledgerError } = await this.supabase
      .from('ledger_accounts')
      .insert({
        owner_type: 'investment',
        owner_id: null, // temporarily null
        name: 'Pending investment',
        currency: plan.currency,
      })
      .select()
      .single();

    if (ledgerError) throw new BadRequestException(ledgerError.message);

    // 4. Create investment using ledger account
    const { data: investment, error: invError } = await this.supabase
      .from('investments')
      .insert({
        user_id: userId,
        plan_id: plan.id,
        ledger_account_id: investmentLedger.id,
        principal: dto.amount,
        status: 'pending',
        start_date: new Date(),
        end_date: new Date(
          Date.now() + plan.duration_days * 24 * 60 * 60 * 1000,
        ),
      })
      .select()
      .single();

    if (invError) throw new BadRequestException(invError.message);

    // 5. Backfill ledger account owner_id
    await this.supabase
      .from('ledger_accounts')
      .update({
        owner_id: investment.id,
        name: `Investment ${investment.id}`,
      })
      .eq('id', investmentLedger.id);

    // 6. Ledger transfer
    await this.ledger.transfer(
      investment.id,
      userWallet.id,
      investmentLedger.id,
      dto.amount,
    );

    // 7. Activate investment
    await this.supabase
      .from('investments')
      .update({ status: 'active' })
      .eq('id', investment.id);

    await this.promotionService.checkReferralMilestone(userId);

    return investment;
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
    /**
     * 1. Fetch investment
     */
    const { data: investment, error: invError } = await this.supabase
      .from('investments')
      .select(
        `
      id,
      user_id,
      ledger_account_id,
      principal,
      accrued_return,
      status,
      end_date
    `,
      )
      .eq('id', investmentId)
      .maybeSingle();

    if (invError || !investment) {
      console.log(invError);

      throw new BadRequestException('Investment not found');
    }

    if (investment.status !== 'active') {
      throw new BadRequestException('Only active investments can be matured');
    }

    // if (new Date(investment.end_date) > new Date()) {
    //   throw new BadRequestException('Investment has not matured yet');
    // }

    /**
     * 2. Get user wallet ledger account
     */
    const userWallet = await this.ledger.getUserWalletAccount(
      investment.user_id,
    );

    if (!userWallet) {
      throw new BadRequestException('User wallet not found');
    }

    /**
     * 3. Calculate payout
     */
    const payoutAmount =
      Number(investment.principal) + Number(investment.accrued_return);

    if (payoutAmount <= 0) {
      throw new BadRequestException('Invalid payout amount');
    }

    /**
     * 4. Create RETURN transaction
     */
    const { data: transaction, error: txError } = await this.supabase
      .from('transactions')
      .insert({
        type: 'return',
        amount: payoutAmount,
        status: 'approved',
        reference: `RET-${investment.id}`,
        description: 'Investment maturity payout',
        approved_by: adminId,
        approved_at: new Date(),
        wallet_id: userWallet.id,
        created_by: adminId,
      })
      .select()
      .single();

    if (txError || !transaction) {
      console.log(txError);
      throw new BadRequestException('Failed to create return transaction');
    }

    /**
     * 5. Ledger transfer
     *    Debit investment pool → Credit user wallet
     */
    try {
      await this.ledger.transfer(
        transaction.id,
        investment.ledger_account_id, // investment pool
        userWallet.id, // user wallet
        payoutAmount,
      );
    } catch (err: any) {
      throw new BadRequestException(`Ledger payout failed: ${err.message}`);
    }

    /**
     * 6. Mark investment as matured
     */
    const { error: updateError } = await this.supabase
      .from('investments')
      .update({
        status: 'matured',
        updated_at: new Date(),
      })
      .eq('id', investment.id);

    if (updateError) {
      throw new BadRequestException(updateError.message);
    }

    return {
      status: 'matured',
      payout_amount: payoutAmount,
      transaction_id: transaction.id,
    };
  }

  async updateAccruedReturn(dto: UpdateAccruedReturnDto) {
    // Fetch the investment
    const { data: investment, error: invError } = await this.supabase
      .from('investments')
      .select('id, status')
      .eq('id', dto.investment_id)
      .maybeSingle();

    if (invError || !investment) {
      throw new BadRequestException('Investment not found');
    }

    // Only active investments can have their accrued_return adjusted
    if (!['active', 'pending'].includes(investment.status)) {
      throw new BadRequestException(
        'Only active or pending investments can be adjusted',
      );
    }

    // Update accrued_return
    const { error: updateError, data } = await this.supabase
      .from('investments')
      .update({ accrued_return: dto.accrued_return, updated_at: new Date() })
      .eq('id', dto.investment_id)
      .select()
      .maybeSingle();

    if (updateError || !data) {
      throw new BadRequestException(
        updateError?.message || 'Failed to update accrued return',
      );
    }

    return {
      message: 'Accrued return updated successfully',
      investment: data,
    };
  }

  async getAllInvestments(
    page: number = 1,
    limit: number = 10,
    status?: string,
  ) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = this.supabase.from('investments').select(
      `
      id,
      principal,
      accrued_return,
      status,
      start_date,
      end_date,
      created_at,
      user:users(id, email),
      plan:investment_plans(name, interest_rate, duration_days)
    `,
      { count: 'exact' }, // Get total count for pagination meta
    );

    // Apply filtering if status is provided and not 'all'
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw new BadRequestException(error.message);

    return {
      data,
      meta: {
        total: count,
        page,
        last_page: Math.ceil((count || 0) / limit),
      },
    };
  }
}
