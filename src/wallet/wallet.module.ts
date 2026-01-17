// src/wallets/wallets.module.ts
import { Module } from '@nestjs/common';
import { WalletsService } from './wallet.service';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { WalletsController } from './wallet.controller';

@Module({
  imports: [SupabaseModule],
  controllers: [WalletsController],
  providers: [WalletsService],
  exports: [WalletsService],
})
export class WalletsModule {}
