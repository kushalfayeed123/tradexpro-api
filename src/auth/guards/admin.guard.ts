/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(@Inject('SUPABASE_CLIENT') private supabase) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.id) {
      throw new UnauthorizedException('User not authenticated');
    }

    const { data, error } = await this.supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (error || !data) {
      throw new ForbiddenException('Unable to verify user role');
    }

    if (data.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
