/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterDto } from './dtos/register.dto';

@Injectable()
export class AuthService {
  constructor(@Inject('SUPABASE_CLIENT') private supabase) {}

  async register(dto: RegisterDto) {
    const { data, error } = await this.supabase.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: true, // ✅ safer default
    });

    if (error || !data?.user) {
      throw new BadRequestException(
        error?.message ?? 'Failed to create auth user',
      );
    }

    const userId = data.user.id;

    const { error: userError } = await this.supabase.from('users').insert({
      id: userId,
      email: dto.email,
      role: 'investor',
      is_verified: true,
    });

    if (userError) {
      // rollback auth user
      await this.supabase.auth.admin.deleteUser(userId);
      throw new InternalServerErrorException('Failed to create user record');
    }

    const { error: profileError } = await this.supabase
      .from('profiles')
      .insert({
        user_id: userId,
        first_name: dto.firstName,
        last_name: dto.lastName,
        phone: dto.phone ?? null,
        country: dto.country ?? null,
      });

    if (profileError) {
      // rollback everything
      await this.supabase.from('users').delete().eq('id', userId);
      await this.supabase.auth.admin.deleteUser(userId);

      throw new InternalServerErrorException('Failed to create user profile');
    }

    const { error: walletError } = await this.supabase.from('wallets').insert({
      user_id: data.user.id,
      currency: 'USD',
    });

    if (walletError) {
      // rollback everything
      await this.supabase.from('profile').delete().eq('user_id', userId);
      await this.supabase.from('users').delete().eq('id', userId);
      await this.supabase.auth.admin.deleteUser(userId);

      throw new InternalServerErrorException('Failed to create user wallet');
    }

    await this.supabase.from('ledger_accounts').insert({
      owner_type: 'user',
      owner_id: userId,
      name: 'wallet',
    });

    return {
      message: 'User registered successfully',
      userId,
    };
  }

  async login(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw new UnauthorizedException(error.message);
    console.error(error);

    return {
      access_token: data.session.access_token,
      user: data.user,
    };
  }
}
