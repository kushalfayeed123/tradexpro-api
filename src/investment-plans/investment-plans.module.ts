import { Module } from '@nestjs/common';
import { InvestmentPlansController } from './investment-plans.controller';
import { InvestmentPlansService } from './investment-plans.service';
import { SupabaseModule } from 'src/supabase/supabase.module';

@Module({
  controllers: [InvestmentPlansController],
  providers: [InvestmentPlansService],
  imports: [SupabaseModule],
  exports: [InvestmentPlansService],
})
export class InvestmentPlansModule {}
