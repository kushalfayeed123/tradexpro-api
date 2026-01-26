/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

interface InvestmentWithPlan {
  id: string;
  principal: number;
  accrued_return: number;
  status: string;
  investment_plans: { name: string }; // Notice this is an object, not an array
}

@Injectable()
export class OverviewService {
  constructor(@Inject('SUPABASE_CLIENT') private supabase: SupabaseClient) {}

  async getUserDashboardSummary(userId: string) {
    try {
      // 1. Get Liquid Balance from the Supabase View
      // Assuming the view has columns: owner_id and balance
      const { data: walletView, error: walletError } = await this.supabase
        .from('wallet_balances')
        .select('balance')
        .eq('user_id', userId)
        .maybeSingle();

      if (walletError) throw walletError;

      const ledgerBalance = walletView?.balance || 0;

      // 2. Get Active Investments (Locked Capital)
      const { data, error: invError } = await this.supabase
        .from('investments')
        .select(
          `
          id, 
          principal, 
          accrued_return, 
          status,
          investment_plans!inner (name)        `,
        )
        .eq('user_id', userId);
      const investments = data as unknown as InvestmentWithPlan[];

      if (invError) throw invError;

      // 3. Aggregations
      const activeInvestmentsTotal =
        investments?.reduce((acc, inv) => acc + Number(inv.principal), 0) || 0;

      // Total Net Worth = Liquid Balance (from View) + Locked Principal
      const totalNetWorth = ledgerBalance + activeInvestmentsTotal;

      const totalAccrued =
        investments?.reduce(
          (acc, inv) => acc + Number(inv.accrued_return),
          0,
        ) || 0;
      const growthPct =
        activeInvestmentsTotal > 0
          ? (totalAccrued / activeInvestmentsTotal) * 100
          : 0;

      // 4. Fetch Activity History
      const { data: transactions } = await this.supabase
        .from('transactions')
        .select('*')
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
        .limit(5);
      console.log(investments);
      return {
        total_net_worth: totalNetWorth,
        ledger_balance: ledgerBalance,
        active_investments: activeInvestmentsTotal,
        growth_percentage: growthPct.toFixed(2),
        yield_progress: Math.min(Math.round(growthPct), 100),
        next_distribution_days: 4,
        active_portfolio:
          investments?.map((inv) => ({
            id: inv.id,
            plan_name: inv.investment_plans.name,
            capital: inv.principal,
            profit: inv.accrued_return,
            status: inv.status,
          })) || [],
        recent_activity:
          transactions?.map((tx) => ({
            id: tx.id,
            title: tx.description || tx.type,
            amount: tx.amount,
            type: tx.type,
            status: tx.status,
            date: tx.created_at,
          })) || [],
      };
    } catch (error) {
      console.error('Overview Error:', error);
      throw new InternalServerErrorException(
        'Could not retrieve dashboard data',
      );
    }
  }

  /**
   * Helper to sum credits and subtract debits from ledger entries
   */
  private calculateBalance(entries: any[]): number {
    return entries.reduce((acc, entry) => {
      return entry.direction === 'credit'
        ? acc + Number(entry.amount)
        : acc - Number(entry.amount);
    }, 0);
  }
}
