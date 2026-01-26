import { Module } from '@nestjs/common';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { OverviewService } from './investment-overview.service';
import { OverviewController } from './investment-overvew.controller';

@Module({
  controllers: [OverviewController],
  imports: [SupabaseModule],
  providers: [OverviewService],
})
export class InvestmentOverviewModule {}
