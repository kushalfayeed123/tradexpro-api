/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { KycService } from '../kyc.service';

@Injectable()
export class KycGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private kycService: KycService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const requiredLevel = this.reflector.get<number>(
      'kycLevel',
      ctx.getHandler(),
    );

    if (!requiredLevel) return true;

    const req = ctx.switchToHttp().getRequest();
    const user = req.user;

    if (!user) throw new UnauthorizedException();

    // Admin bypass
    if (user.role === 'admin') return true;

    await this.kycService.assertKyc(user.id, requiredLevel);
    return true;
  }
}
