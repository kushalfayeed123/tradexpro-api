import { Module } from '@nestjs/common';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { AdminTransactionsController } from './transactions.controller';
import { TransactionsService } from 'src/transactions/transactions.service';
import { LedgerModule } from 'src/ledger/ledger.module';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [SupabaseModule, LedgerModule],
  controllers: [AdminTransactionsController, AdminController],
  providers: [TransactionsService, AdminService],
  exports: [TransactionsService],
})
export class AdminModule {}
