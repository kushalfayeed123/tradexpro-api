/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { getPaginationRange } from 'src/pagination.helper';

@Injectable()
export class UsersService {
  constructor(@Inject('SUPABASE_CLIENT') private supabase) {}

  /**
   * Get all users (basic info)
   */
  async getAllUsers(query: any) {
    const { page = 1, limit = 20, email, role } = query;
    const { from, to } = getPaginationRange(page, limit);

    // 1. Primary Fetch: Users, Profiles, and KYC
    // We remove the wallet join here to prevent the "Relationship not found" error
    let qb = this.supabase.from('users').select(
      `
    id,
    email,
    role,
    is_verified,
    created_at,
    profile:profiles!profiles_user_id_fkey (
      first_name, 
      last_name, 
      phone, 
      country
    ),
    kyc:kyc_records!kyc_records_user_fkey (
      status, 
      level
    )
  `,
      { count: 'exact' },
    );

    if (email) qb = qb.ilike('email', `%${email}%`);
    if (role) qb = qb.eq('role', role);
    // if (kyc_status && kyc_status !== 'all') {
    //   qb = qb.filter('kyc.status', 'eq', kyc_status);
    // }

    const {
      data: users,
      error: userError,
      count,
    } = await qb.order('created_at', { ascending: false }).range(from, to);

    if (userError) throw new BadRequestException(userError.message);
    if (!users || users.length === 0) return { data: [], meta: { total: 0 } };

    // 2. Secondary Fetch: Get Balances from the View for these specific IDs
    const userIds = users.map((u) => u.id);
    const { data: balances, error: balanceError } = await this.supabase
      .from('wallet_balances')
      .select('user_id, balance')
      .in('user_id', userIds);

    // We don't throw if balances fail; we just default them to 0
    if (balanceError)
      console.error('Balance View Error:', balanceError.message);

    // 3. Format and Merge
    const formattedData = users.map((user) => {
      const rawKyc = Array.isArray(user.kyc) ? user.kyc[0] : user.kyc;
      const kycData = rawKyc || { status: 'none', level: 0 };
      const profileData = Array.isArray(user.profile)
        ? user.profile[0]
        : user.profile;
      const walletData = balances?.find((b) => b.user_id === user.id);

      return {
        id: user.id,
        email: user.email,
        role: user.role,
        is_verified: user.is_verified,
        created_at: user.created_at,
        profile: profileData,
        kyc: kycData,
        full_name: profileData
          ? `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() ||
            'No Name'
          : 'N/A',
        wallet: {
          balance: walletData?.balance ?? 0,
        },
      };
    });

    return {
      data: formattedData,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / Number(limit)),
      },
    };
  }
  /**
   * Get full user details
   */
  async getUserDetails(userId: string) {
    const { data, error } = await this.supabase
      .from('profiles')
      .select(
        `
        id,
        email,
        full_name,
        phone,
        created_at,
        role,

        wallet:wallets(*),

        kyc:kyc_records(
          id,
          level,
          status,
          created_at,
          documents:kyc_documents(*)
        ),

        investments:investments(
          id,
          amount,
          status,
          created_at,
          plan:investment_plans(name, roi, duration_days)
        )
      `,
      )
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) throw new BadRequestException('User not found');

    return data;
  }
}
