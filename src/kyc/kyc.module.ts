import { Module } from '@nestjs/common';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';
import { KycGuard } from './guards/kyc.guard';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [
    SupabaseModule,
    MulterModule.register({
      dest: './uploads', // optional, used by Multer internally
    }),
  ],
  controllers: [KycController],
  providers: [KycService, KycGuard],
})
export class KycModule {}
