import { Module } from '@nestjs/common';
import { LedgerService } from 'src/ledger/ledger.service';
import { InvestmentsController } from './investment.controller';
import { InvestmentsService } from './investment.service';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { KycService } from 'src/kyc/kyc.service';

@Module({
  controllers: [InvestmentsController],
  imports: [SupabaseModule],
  providers: [InvestmentsService, LedgerService, KycService],
})
export class InvestmentsModule {}
