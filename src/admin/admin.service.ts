/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/deposit-methods/deposit-methods.service.ts
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { CreateDepositMethodDto } from './dtos/deposit-method.dto';

@Injectable()
export class AdminService {
  // Inject your Supabase Client (assuming it's provided in your module)
  constructor(@Inject('SUPABASE_CLIENT') private supabase: SupabaseClient) {}

  // ADMIN: Add new wallet
  async create(dto: CreateDepositMethodDto) {
    const { data, error } = await this.supabase
      .from('deposit_methods')
      .insert([dto])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  // ADMIN: Get all for management
  async findAll() {
    const { data, error } = await this.supabase
      .from('deposit_methods')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }

  // ADMIN: Update
  async update(id: string, dto: Partial<CreateDepositMethodDto>) {
    const { data, error } = await this.supabase
      .from('deposit_methods')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new NotFoundException('Method not found');
    return data;
  }

  // ADMIN: Delete
  async remove(id: string) {
    const { error } = await this.supabase
      .from('deposit_methods')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
    return { deleted: true };
  }

  // INVESTOR: Get only active methods
  async findActive() {
    const { data, error } = await this.supabase
      .from('deposit_methods')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.log(error);
      throw new Error(error.message);
    }
    return data;
  }

  async getDashboardSummary() {
    const { data, error } = await this.supabase.rpc(
      'get_admin_dashboard_stats',
    );

    if (error) throw new BadRequestException(error.message);
    return data;
  }
}
