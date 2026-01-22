/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/transactions/transactions.service.ts
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CreateTransactionDto } from './dtos/create-transaction.dto';
import { LedgerService } from 'src/ledger/ledger.service';

@Injectable()
export class TransactionsService {
  constructor(
    @Inject('SUPABASE_CLIENT') private supabase,
    private readonly ledger: LedgerService,
  ) {}

  async create(userId: string, dto: CreateTransactionDto) {
    const { data: existing } = await this.supabase
      .from('transactions')
      .select('id')
      .eq('reference', dto.reference)
      .maybeSingle();

    if (existing) {
      throw new BadRequestException('Duplicate transaction reference');
    }

    const { data, error } = await this.supabase
      .from('transactions')
      .insert({
        wallet_id: dto.wallet_id,
        amount: dto.amount,
        type: dto.type,
        reference: dto.reference,
        description: dto.description,
        created_by: userId,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    return data;
  }

  async list(userId: string) {
    const { data: wallet } = await this.supabase
      .from('ledger_accounts')
      .select('id')
      .eq('owner_id', userId)
      .single();

    return this.supabase
      .from('transactions')
      .select('*')
      .eq('wallet_id', wallet.id)
      .order('created_at', { ascending: false });
  }

  // --- Helper: Fetch transaction by ID ---
  async getTransaction(transactionId: string) {
    const { data, error } = await this.supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .maybeSingle(); // returns null if not found

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new BadRequestException('Transaction not found');

    return data;
  }

  // --- Helper: Fetch system funding account ---
  async getSystemFundingAccount() {
    const { data, error } = await this.supabase
      .from('ledger_accounts')
      .select('*')
      .eq('owner_type', 'system')
      .eq('name', 'funding')
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    if (!data)
      throw new BadRequestException('System funding account not found');

    return data;
  }

  async approveTransaction(adminId: string, transactionId: string) {
    const tx = await this.getTransaction(transactionId);

    if (tx.status !== 'pending')
      throw new BadRequestException('Transaction already processed');

    const userWallet = await this.ledger.getUserWalletAccount(tx.created_by);
    if (!userWallet) throw new BadRequestException('User wallet not found');

    const systemWallet = await this.getSystemFundingAccount();
    if (!systemWallet)
      throw new BadRequestException('System funding account not found');

    switch (tx.type) {
      case 'deposit':
        // system → user
        await this.ledger.transfer(
          tx.id,
          systemWallet.id,
          userWallet.id,
          tx.amount,
        );
        break;

      case 'withdrawal':
        // user → system
        await this.ledger.transfer(
          tx.id,
          userWallet.id,
          systemWallet.id,
          tx.amount,
        );
        break;

      default:
        throw new BadRequestException(
          `Unsupported transaction type: ${tx.type}`,
        );
    }

    await this.supabase
      .from('transactions')
      .update({
        status: 'approved',
        approved_at: new Date(),
        approved_by: adminId,
      })
      .eq('id', transactionId);

    return { status: 'approved' };
  }

  // --- Reject transaction ---
  async rejectTransaction(adminId: string, transactionId: string) {
    const { data, error } = await this.supabase
      .from('transactions')
      .update({
        status: 'rejected',
        approved_by: adminId,
        approved_at: new Date(),
      })
      .eq('id', transactionId)
      .eq('status', 'pending')
      .select()
      .maybeSingle();

    if (error || !data)
      throw new BadRequestException('Unable to reject transaction');

    return { status: 'rejected' };
  }

  async reverseTransaction(adminId: string, transactionId: string) {
    const { data: tx, error } = await this.supabase
      .from('transactions')
      .select('id, status')
      .eq('id', transactionId)
      .maybeSingle();

    if (error || !tx) {
      throw new BadRequestException('Transaction not found');
    }

    if (tx.status !== 'approved') {
      throw new BadRequestException(
        'Only approved transactions can be reversed',
      );
    }

    // Atomic reversal + status update happens INSIDE RPC
    const { error: rpcError } = await this.supabase.rpc('reverse_transaction', {
      p_transaction_id: transactionId,
      p_admin_id: adminId,
    });

    if (rpcError) {
      throw new BadRequestException(rpcError.message);
    }

    return { status: 'reversed' };
  }

  async getAllTransactions() {
    const { data, error } = await this.supabase
      .from('transactions')
      .select(
        `
        id,
        amount,
        type,
        status,
        created_at,
        user:profiles(id, email, full_name)
      `,
      )
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data;
  }
}
