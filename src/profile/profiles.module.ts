// src/profiles/profiles.module.ts
import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthModule } from '../auth/auth.module';
import { ProfilesController } from './profiles.controller';

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [ProfilesController],
})
export class ProfilesModule {}
