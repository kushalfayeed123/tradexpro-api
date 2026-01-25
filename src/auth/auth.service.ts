/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterDto } from './dtos/register.dto';
import { NotificationService } from 'src/notifications/notification.service';
import { EmailTemplate } from 'src/helpers/email-template.helper';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    @Inject('SUPABASE_CLIENT') private supabase,
    private notificationService: NotificationService,
    private emailTemplate: EmailTemplate,
  ) {}

  async register(dto: RegisterDto) {
    try {
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
        is_verified: false,
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

      const { error: ledgerError } = await this.supabase
        .from('ledger_accounts')
        .insert({
          owner_type: 'user',
          owner_id: userId,
          name: 'wallet',
        });

      if (ledgerError) {
        // rollback everything
        await this.supabase.from('users').delete().eq('id', userId);
        await this.supabase.from('profiles').delete().eq('user_id', userId);
        await this.supabase.auth.admin.deleteUser(userId);

        throw new InternalServerErrorException(
          'Failed to create user ledger record',
        );
      }

      let otpSent = false;
      try {
        await this.notificationService.requestOTP(
          userId,
          dto.email,
          dto.phone ?? '',
          'verification',
        );
        otpSent = true;
      } catch (otpError) {
        this.logger.error(`OTP sending failed for ${userId}: ${otpError}`);
      }

      if (!otpSent) {
        return {
          success: false, // Explicitly tell frontend it's not a full success
          message:
            'Account created, but we failed to send the verification code. Please request a new one.',
          userId,
          requiresResend: true,
        };
      }

      return {
        success: true,
        message:
          'User registered successfully. Please check your email/phone for the OTP.',
        userId,
      };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async verifyOTP(userId: string, code: string) {
    const { data: otp, error } = await this.supabase
      .from('otp_codes')
      .select('*')
      .eq('user_id', userId)
      .eq('code', code)
      .eq('type', 'verification')
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString()) // Must not be expired
      .maybeSingle();

    if (error || !otp) {
      console.log(error, otp);
      throw new BadRequestException('Invalid or expired verification code');
    }
    const { data: user } = await this.supabase
      .from('users')
      .select('email, profile:profiles(first_name)')
      .eq('id', userId)
      .single();

    // 2. Mark as used so it can't be reused (Replay Attack protection)
    await this.supabase
      .from('otp_codes')
      .update({ is_used: true })
      .eq('id', otp.id);

    const { error: userError } = await this.supabase
      .from('users')
      .update({ is_verified: true })
      .eq('id', userId);

    if (userError)
      throw new InternalServerErrorException('Verification failed');

    const firstName = user?.profile?.first_name || 'there';
    const welcomeHtml = this.emailTemplate.welcome(firstName);

    await this.notificationService.enqueueEmail(
      userId,
      user.email,
      'Welcome to TopEquity!',
      welcomeHtml,
    );

    return {
      message: 'Account verified and welcome email sent',
      success: true,
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
