// src/users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthModule } from '../auth/auth.module';
import { UsersService } from './users.service';

@Module({
  imports: [AuthModule, SupabaseModule], // ✅ AuthModule imported
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
