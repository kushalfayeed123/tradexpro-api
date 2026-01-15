/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class AuthService {
  constructor(@Inject('SUPABASE_CLIENT') private supabase) {}

  async register(email: string, password: string) {
    const { data, error } = await this.supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) throw new BadRequestException(error.message);

    await this.supabase.from('users').insert({
      id: data.user.id,
      email,
    });

    await this.supabase.from('profiles').insert({
      user_id: data.user.id,
    });

    return { message: 'User registered successfully' };
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
