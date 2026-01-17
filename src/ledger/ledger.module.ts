import { Module } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { SupabaseModule } from 'src/supabase/supabase.module';

@Module({
  providers: [LedgerService],
  imports: [SupabaseModule],
  exports: [LedgerService],
})
export class LedgerModule {}
