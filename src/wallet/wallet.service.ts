/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/wallets/wallets.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';

@Injectable()
export class WalletsService {
  constructor(@Inject('SUPABASE_CLIENT') private supabase) {}

  async getByUserId(userId: string) {
    const { data, error } = await this.supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Wallet not found');
    }

    return data;
  }

  async create(userId: string, currency: string) {
    const { data: existing } = await this.supabase
      .from('wallets')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existing) {
      throw new BadRequestException('Wallet already exists');
    }

    const { data, error } = await this.supabase
      .from('wallets')
      .insert({
        user_id: userId,
        currency,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }
}
