/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/transactions/transactions.service.ts
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CreateTransactionDto } from './dtos/create-transaction.dto';
import { LedgerService } from 'src/ledger/ledger.service';
import { getPaginationRange } from 'src/pagination.helper';
import { NotificationService } from 'src/notifications/notification.service';

@Injectable()
export class TransactionsService {
  constructor(
    @Inject('SUPABASE_CLIENT') private supabase,
    private readonly ledger: LedgerService,
    private readonly notificationService: NotificationService,
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
        // Metadata columns
        sender_address: dto.sender_address,
        beneficiary_address: dto.beneficiary_address,
        txn_hash: dto.txn_hash,
        payment_method: dto.payment_method,
        receipt_url: dto.receipt_url,
        // Status and Ownership
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
    // 1. Fetch transaction with user email joined
    const { data: tx, error: fetchError } = await this.supabase
      .from('transactions')
      .select(
        `
        *,
        user:users!transactions_created_by_fkey (
          email,
          profile:profiles (first_name)
        )
      `,
      )
      .eq('id', transactionId)
      .single();

    if (fetchError || !tx)
      throw new BadRequestException('Transaction not found');
    if (tx.status !== 'pending')
      throw new BadRequestException('Transaction already processed');

    const userWallet = await this.ledger.getUserWalletAccount(tx.created_by);
    const systemWallet = await this.getSystemFundingAccount();

    // 2. Execute Ledger Transfer
    switch (tx.type) {
      case 'deposit':
        await this.ledger.transfer(
          tx.id,
          systemWallet.id,
          userWallet.id,
          tx.amount,
        );
        break;
      case 'withdrawal':
        await this.ledger.transfer(
          tx.id,
          userWallet.id,
          systemWallet.id,
          tx.amount,
        );
        break;
      default:
        throw new BadRequestException(`Unsupported type: ${tx.type}`);
    }

    // 3. Update Status
    await this.supabase
      .from('transactions')
      .update({
        status: 'approved',
        approved_at: new Date(),
        approved_by: adminId,
      })
      .eq('id', transactionId);

    // 4. Send Notification
    const firstName = tx.user?.profile?.first_name || 'Investor';
    const emailSubject = `Transaction Approved: ${tx.reference}`;
    const emailContent = `
      <h3>Hello ${firstName},</h3>
      <p>Your <b>${tx.type}</b> request of <b>$${tx.amount.toLocaleString()}</b> has been successfully approved.</p>
      <p>The funds are now reflected in your ledger balance.</p>
      <p>Reference: <code>${tx.reference}</code></p>
    `;

    // Fire and forget email (don't block the response)
    this.notificationService
      .enqueueEmail(tx.created_by, tx.user.email, emailSubject, emailContent)
      .catch(console.error);

    return { status: 'approved' };
  }

  async rejectTransaction(adminId: string, transactionId: string) {
    // 1. Fetch transaction with user details
    const { data: tx, error: fetchError } = await this.supabase
      .from('transactions')
      .select(
        `
        *,
        user:users!transactions_created_by_fkey (
          email,
          profile:profiles (first_name)
        )
      `,
      )
      .eq('id', transactionId)
      .single();

    if (fetchError || !tx)
      throw new BadRequestException('Transaction not found');

    // 2. Update Status
    const { error: updateError } = await this.supabase
      .from('transactions')
      .update({
        status: 'rejected',
        approved_by: adminId,
        approved_at: new Date(),
      })
      .eq('id', transactionId)
      .eq('status', 'pending');

    if (updateError)
      throw new BadRequestException('Unable to reject transaction');

    // 3. Send Notification
    const firstName = tx.user?.profile?.first_name || 'Investor';
    const emailSubject = `Transaction Declined: ${tx.reference}`;
    const emailContent = `
      <h3>Hello ${firstName},</h3>
      <p>We regret to inform you that your <b>${tx.type}</b> request of <b>$${tx.amount.toLocaleString()}</b> was declined.</p>
      <p>If you have any questions regarding this decision, please contact our support team.</p>
      <p>Reference: <code>${tx.reference}</code></p>
    `;

    this.notificationService
      .enqueueEmail(tx.created_by, tx.user.email, emailSubject, emailContent)
      .catch(console.error);

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

  // transactions.service.ts
  async getAllTransactions(query: any) {
    const { page = 1, limit = 20, type, status, search } = query;
    const { from, to } = getPaginationRange(page, limit);

    let qb = this.supabase.from('transactions').select(
      `
      *,
      investor:users!transactions_created_by_fkey (
        id, 
        email, 
        profile:profiles (first_name, last_name)
      )
    `,
      { count: 'exact' },
    );

    if (type && type !== 'all') qb = qb.eq('type', type);
    if (status && status !== 'all') qb = qb.eq('status', status);
    if (search) qb = qb.ilike('reference', `%${search}%`);

    const { data, error, count } = await qb
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw new BadRequestException(error.message);

    const formattedData = data.map((trx) => ({
      ...trx,
      user: trx.investor?.profile
        ? `${trx.investor.profile.first_name} ${trx.investor.profile.last_name}`
        : 'System',
      method: trx.description || '',
      date: new Date(trx.created_at).toLocaleDateString(),
    }));

    return { data: formattedData, meta: { total: count, page, limit } };
  }

  async getStats() {
    const { data, error } = await this.supabase.rpc('get_ledger_stats');

    if (error) {
      console.error('Error fetching stats:', error);
      return { totalVolume: 0, pendingApprovals: 0, failedLast7Days: 0 };
    }

    return data; // Returns the JSON object directly
  }
}
