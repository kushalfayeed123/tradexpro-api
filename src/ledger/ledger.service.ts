/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class LedgerService {
  constructor(@Inject('SUPABASE_CLIENT') private supabase) {}

  async getUserWalletAccount(userId: string) {
    const { data } = await this.supabase
      .from('ledger_accounts')
      .select('*')
      .eq('owner_type', 'user')
      .eq('owner_id', userId)
      .eq('name', 'wallet')
      .single();

    return data;
  }

  async transfer(
    transactionId: string,
    fromAccount: string,
    toAccount: string,
    amount: number,
  ) {
    const { error } = await this.supabase.rpc('transfer_funds', {
      p_transaction_id: transactionId,
      p_from_account: fromAccount,
      p_to_account: toAccount,
      p_amount: amount,
    });

    if (error) {
      throw new Error(error.message);
    }
  }
}
