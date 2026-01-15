import { Module } from '@nestjs/common';
import { SupabaseProvider } from './supabase.provider';

// supabase.module.ts
@Module({
  providers: [SupabaseProvider],
  exports: ['SUPABASE_CLIENT'],
})
export class SupabaseModule {}
