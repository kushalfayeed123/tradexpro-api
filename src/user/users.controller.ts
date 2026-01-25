/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Request } from 'express';
import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  InternalServerErrorException,
  Param,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';
import { SupabaseClient } from '@supabase/supabase-js';
import { UsersService } from './users.service';
import { AdminGuard } from 'src/auth/guards/admin.guard';
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    @Inject('SUPABASE_CLIENT') private supabase: SupabaseClient,
    private usersService: UsersService,
  ) {}

  @Get('me')
  async me(@Req() req: Request & { user: any }) {
    const userId = req.user.sub || req.user.id; // Supabase JWTs often use 'sub' for the ID
    // 1️⃣ User + profile
    const { data: user, error: userError } = await this.supabase
      .from('users')
      .select(
        `
        id, email, role, created_at, is_verified,
        profile:profiles (first_name, last_name, phone, country)
    `,
      )
      .eq('id', userId)
      .maybeSingle();

    if (userError) throw new InternalServerErrorException(userError.message);
    if (!user) throw new UnauthorizedException('User not found in database.');

    const profile = Array.isArray(user.profile)
      ? user.profile[0]
      : user.profile;
    // 2️⃣ Wallet account
    const { data: walletAccount } = await this.supabase
      .from('ledger_accounts')
      .select('id, currency')
      .eq('owner_id', userId)
      .eq('name', 'wallet')
      .limit(1)
      .maybeSingle();

    // 3️⃣ Wallet balance
    const { data: walletBalance } = await this.supabase
      .from('wallet_balances')
      .select('balance')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    return {
      ...user,
      // Ensure profile is returned as an object, not an array
      profile: profile || null,
      wallet: {
        id: walletAccount?.id ?? null,
        currency: walletAccount?.currency ?? 'USD',
        balance: walletBalance?.balance ?? 0,
      },
    };
  }

  /**
   * Fetch all users
   */
  @UseGuards(AdminGuard)
  @Get()
  async getAllUsers(@Query() query: any) {
    return await this.usersService.getAllUsers(query);
  }

  /**
   * Fetch full user details
   * profile + wallet + kyc + investments
   */
  @UseGuards(AdminGuard)
  @Get(':userId')
  async getUserDetails(@Param('userId') userId: string) {
    if (!userId) throw new BadRequestException('Invalid user id');
    return await this.usersService.getUserDetails(userId);
  }
}
