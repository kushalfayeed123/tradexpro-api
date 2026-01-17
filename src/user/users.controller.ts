/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Request } from 'express';
import { Controller, Get, Inject, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';
import { SupabaseClient } from '@supabase/supabase-js';
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(@Inject('SUPABASE_CLIENT') private supabase: SupabaseClient) {}

  @Get('me')
  async me(@Req() req: Request & { user: any }) {
    const userId = req.user.id;

    // 1️⃣ User + profile
    const { data: user, error: userError } = await this.supabase
      .from('users')
      .select(
        `
        id,
        email,
        role,
        created_at,
        profile:profiles!left (
          first_name,
          last_name,
          phone,
          country
        )
      `,
      )
      .eq('id', userId)
      .single();

    if (userError) throw new Error(userError.message);

    // 2️⃣ Wallet account
    const { data: walletAccount } = await this.supabase
      .from('ledger_accounts')
      .select('id, currency')
      .eq('owner_type', 'user')
      .eq('owner_id', userId)
      .eq('name', 'wallet')
      .maybeSingle();

    // 3️⃣ Wallet balance (derived)
    const { data: walletBalance } = await this.supabase
      .from('wallet_balances')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle();

    return {
      ...user,
      wallet: {
        id: walletAccount?.id ?? null,
        currency: walletAccount?.currency ?? 'NGN',
        balance: walletBalance?.balance ?? 0,
      },
    };
  }
}
