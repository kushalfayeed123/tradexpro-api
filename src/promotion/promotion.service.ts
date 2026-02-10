/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { CreateCouponDto, ValidateCouponDto } from './dtos/promote.dto';

@Injectable()
export class PromotionService {
  constructor(@Inject('SUPABASE_CLIENT') private supabase) {}

  // --- COUPON LOGIC ---

  async validateCoupon(dto: ValidateCouponDto) {
    const { data: coupon, error } = await this.supabase
      .from('coupons')
      .select('*')
      .eq('code', dto.code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !coupon)
      throw new NotFoundException('Coupon not found or inactive');

    if (coupon.used_count >= coupon.max_uses)
      throw new BadRequestException('Coupon limit reached');
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date())
      throw new BadRequestException('Coupon expired');
    if (dto.amount < coupon.min_investment)
      throw new BadRequestException(
        `Min investment $${coupon.min_investment} required`,
      );

    return coupon;
  }

  // --- REFERRAL LOGIC ---

  generateReferralCode(name: string): string {
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${name.substring(0, 3).toUpperCase()}-${randomStr}`;
  }

  async handleSignupReferral(refereeId: string, referralCode: string) {
    const { data: referrerProfile } = await this.supabase
      .from('profiles')
      .select('user_id')
      .eq('referral_code', referralCode)
      .single();

    if (referrerProfile && referrerProfile.user_id !== refereeId) {
      await this.supabase.from('referrals').insert({
        referrer_id: referrerProfile.user_id,
        referee_id: refereeId,
        status: 'pending',
      });
    }
  }

  // promotion.service.ts

  async checkReferralMilestone(refereeId: string) {
    // 1. Check if this user was actually referred by someone
    const { data: referral, error: refError } = await this.supabase
      .from('referrals')
      .select('referrer_id, status')
      .eq('referee_id', refereeId)
      .eq('status', 'pending') // Only process if not already rewarded
      .single();

    if (refError || !referral) return; // Not a referred user or already rewarded

    // 2. Calculate total successful deposits for the referee
    const { data: txs } = await this.supabase
      .from('transactions')
      .select('amount')
      .eq('created_by', refereeId)
      .eq('type', 'deposit')
      .eq('status', 'approved');

    const totalDeposited =
      txs?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0;

    // 3. If they hit the threshold (e.g., $500), trigger the reward
    const THRESHOLD = 50;
    const REWARD_AMOUNT = 5;

    if (totalDeposited >= THRESHOLD) {
      // Calling the SQL function we wrote earlier.
      // It handles the Ledger transfer from System -> Referrer
      const { error: rewardError } = await this.supabase.rpc(
        'fn_process_referral_reward',
        {
          p_referee_id: refereeId,
          p_reward_amount: REWARD_AMOUNT,
        },
      );

      if (rewardError) {
        console.error(
          `Failed to reward referrer for referee ${refereeId}: ${rewardError.message}`,
        );
      }
    }
  }
  async createCoupon(dto: CreateCouponDto) {
    // 1. Sanitize the code (Remove spaces, convert to Uppercase)
    const sanitizedCode = dto.code.trim().toUpperCase();

    // 2. Check if a coupon with this code already exists
    const { data: existing } = await this.supabase
      .from('coupons')
      .select('id')
      .eq('code', sanitizedCode)
      .single();

    if (existing) {
      throw new BadRequestException(
        `Coupon code "${sanitizedCode}" already exists.`,
      );
    }

    // 3. Insert into Supabase
    const { data, error } = await this.supabase
      .from('coupons')
      .insert([
        {
          code: sanitizedCode,
          discount_type: dto.discountType,
          discount_value: dto.discountValue,
          min_investment: dto.minInvestment,
          max_uses: dto.maxUses,
          used_count: 0, // Explicitly initialize
          expires_at: dto.expiresAt,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (error) {
      throw new BadRequestException(
        `Failed to create coupon: ${error.message}`,
      );
    }

    return data;
  }

  async getReferralStats(userId: string) {
    // 1. Concurrently fetch the user's referral code and their referral history
    const [profileRes, referralsRes] = await Promise.all([
      this.supabase
        .from('profiles')
        .select('referral_code')
        .eq('user_id', userId)
        .single(),
      this.supabase
        .from('referrals')
        .select('status, reward_amount')
        .eq('referrer_id', userId),
    ]);

    if (profileRes.error) {
      throw new NotFoundException('User profile not found');
    }

    const referrals = referralsRes.data || [];

    // 2. Calculate statistics from the referrals array
    const stats = {
      referralCode: profileRes.data.referral_code,
      // Sum up reward_amount for all 'rewarded' entries
      totalEarned: referrals
        .filter((r) => r.status === 'rewarded')
        .reduce((sum, r) => sum + Number(r.reward_amount || 0), 0),
      // Count pending vs successful
      pendingCount: referrals.filter((r) => r.status === 'pending').length,
      successfulCount: referrals.filter((r) => r.status === 'rewarded').length,
    };

    return stats;
  }

  // promotion.service.ts

  async getAdminReferralStats() {
    const { data: totals } = await this.supabase
      .from('referrals')
      .select('status, reward_amount');

    return {
      totalReferrals: totals?.length || 0,
      activeRewards: totals?.filter((r) => r.status === 'rewarded').length || 0,
      pendingRewards: totals?.filter((r) => r.status === 'pending').length || 0,
      totalPaidOut:
        totals
          ?.filter((r) => r.status === 'rewarded')
          .reduce((sum, r) => sum + Number(r.reward_amount), 0) || 0,
      conversionRate: totals?.length
        ? (totals.filter((r) => r.status === 'rewarded').length /
            totals.length) *
          100
        : 0,
    };
  }

  async getAllReferrals() {
    const { data, error } = await this.supabase
      .from('referrals')
      .select(
        `
      id,
      status,
      reward_amount,
      created_at,
      referee:users!referrals_referee_id_fkey (email, profile:profiles!user_id(first_name, last_name)),
      referrer:users!referrals_referrer_id_fkey (email, profile:profiles!user_id(first_name, last_name))
    `,
      )
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data;
  }
}
