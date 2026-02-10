import { Module } from '@nestjs/common';
import { LedgerService } from 'src/ledger/ledger.service';
import { InvestmentsController } from './investment.controller';
import { InvestmentsService } from './investment.service';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { KycService } from 'src/kyc/kyc.service';
import { PromotionService } from 'src/promotion/promotion.service';

@Module({
  controllers: [InvestmentsController],
  imports: [SupabaseModule],
  providers: [InvestmentsService, LedgerService, KycService, PromotionService],
})
export class InvestmentsModule {}
