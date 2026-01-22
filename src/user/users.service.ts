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
    const { page = 1, limit = 20, email, role, kyc_status } = query;
    const { from, to } = getPaginationRange(page, limit);

    // 1. Fetch Users, Profiles, and KYC
    let qb = this.supabase.from('users').select(
      `
      id,
      email,
      role,
      is_verified,
      created_at,
      profile:profiles (first_name, last_name, phone, country),
      kyc:kyc_records!kyc_records_user_fkey (status, level)
    `,
      { count: 'exact' },
    );

    if (email) qb = qb.ilike('email', `%${email}%`);
    if (role) qb = qb.eq('role', role);
    if (kyc_status && kyc_status !== 'all') {
      // This tells Supabase to filter the top-level 'users' based on a column in 'kyc_records'
      qb = qb.filter('kyc.status', 'eq', kyc_status);
    }
    const {
      data: users,
      error: userError,
      count,
    } = await qb.order('created_at', { ascending: false }).range(from, to);

    if (userError) throw new BadRequestException(userError.message);
    if (!users || users.length === 0) return { data: [], meta: { total: 0 } };

    // 2. Fetch Balances for these specific users in ONE query
    const userIds = users.map((u) => u.id);
    const { data: balances } = await this.supabase
      .from('wallet_balances')
      .select('user_id, balance')
      .in('user_id', userIds);

    // 3. Merge data
    const formattedData = users.map((user) => {
      // Find the balance for this specific user
      const walletData = balances?.find((b) => b.user_id === user.id);

      return {
        ...user,
        full_name: user.profile
          ? `${user.profile.first_name} ${user.profile.last_name}`.trim()
          : 'N/A',
        kyc: Array.isArray(user.kyc) ? user.kyc[0] : user.kyc,
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
