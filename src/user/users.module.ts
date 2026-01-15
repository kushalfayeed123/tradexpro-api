// src/users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, SupabaseModule], // ✅ AuthModule imported
  controllers: [UsersController],
})
export class UsersModule {}
