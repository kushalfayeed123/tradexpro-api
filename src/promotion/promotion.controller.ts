/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Controller, Post, Body, UseGuards, Get, Param } from '@nestjs/common';
import { AdminGuard } from 'src/auth/guards/admin.guard';
import { ValidateCouponDto, CreateCouponDto } from './dtos/promote.dto';
import { PromotionService } from './promotion.service';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('promotions')
export class PromotionController {
  constructor(private readonly promoService: PromotionService) {}

  @Post('coupons/validate')
  async validate(@Body() dto: ValidateCouponDto) {
    return this.promoService.validateCoupon(dto);
  }
  @Get('referral-stats/:userId')
  async getStats(@Param('userId') userId: string) {
    return await this.promoService.getReferralStats(userId);
  }

  @Post('admin/coupons')
  @UseGuards(AdminGuard)
  async createCoupon(@Body() dto: CreateCouponDto) {
    const result = await this.promoService.createCoupon(dto);
    return {
      success: true,
      message: 'Campaign created successfully',
      data: result,
    };
  }

  @Get('admin/referrals')
  @UseGuards(AdminGuard)
  async getAllReferrals() {
    return await this.promoService.getAllReferrals();
  }

  @Get('admin/stats')
  @UseGuards(AdminGuard)
  async getGlobalStats() {
    return await this.promoService.getAdminReferralStats();
  }
}
