// src/transactions/transactions.module.ts
import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { LedgerService } from 'src/ledger/ledger.service';
import { KycService } from 'src/kyc/kyc.service';

@Module({
  imports: [SupabaseModule],
  controllers: [TransactionsController],
  providers: [TransactionsService, LedgerService, KycService],
})
export class TransactionsModule {}
