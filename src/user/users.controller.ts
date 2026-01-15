/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Request } from 'express';
import { Controller, Get, Inject, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/auth.guard';
import { SupabaseClient } from '@supabase/supabase-js';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(@Inject('SUPABASE_CLIENT') private supabase: SupabaseClient) {}

  @Get('me')
  async me(@Req() req: Request & { user: any }) {
    console.log('User from JWT:', req.user);

    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .maybeSingle(); // Returns null instead of throwing an error if 0 rows found

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }
}
