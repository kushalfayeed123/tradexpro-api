import { Module } from '@nestjs/common';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { AdminTransactionsController } from './transactions.controller';
import { TransactionsService } from 'src/transactions/transactions.service';
import { LedgerModule } from 'src/ledger/ledger.module';

@Module({
  imports: [SupabaseModule, LedgerModule],
  controllers: [AdminTransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class AdminModule {}
