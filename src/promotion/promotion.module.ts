import { Module } from '@nestjs/common';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { PromotionController } from './promotion.controller';
import { PromotionService } from './promotion.service';

@Module({
  imports: [SupabaseModule],
  controllers: [PromotionController],
  providers: [PromotionService],
})
export class PromotionModule {}
