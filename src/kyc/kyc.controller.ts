/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { KycService } from './kyc.service';
import { SubmitKycDto } from './dtos/submit-kyc.dto';
import { ReviewKycDto } from './dtos/review-kyc.dto';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';
import { AdminGuard } from 'src/auth/guards/admin.guard';
import { memoryStorage } from 'multer';

@Controller('kyc')
@UseGuards(JwtAuthGuard)
export class KycController {
  constructor(private readonly kycService: KycService) {}

  /**
   * STEP 1: Initiate KYC (creates draft record)
   */
  @Post('initiate')
  async initiate(@Req() req: any, @Body('level') level: number) {
    return this.kycService.initiateKyc(req.user.id, level);
  }

  /**
   * STEP 2: Upload KYC document (Supabase Storage)
   */
  @Post(':kycId/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(), // crucial!
    }),
  )
  async uploadDocument(
    @Req() req: any,
    @Param('kycId') kycId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return {
      path: await this.kycService.uploadKycDocument(req.user.id, kycId, file),
    };
  }

  /**
   * STEP 3: Submit KYC for review
   */
  @Post('submit')
  async submit(@Req() req: any, @Body() dto: SubmitKycDto) {
    return this.kycService.submitKyc(req.user.id, dto);
  }

  /**
   * ADMIN: Review KYC
   */
  @UseGuards(AdminGuard)
  @Post('admin/:kycId/review')
  async review(
    @Req() req: any,
    @Param('kycId') kycId: string,
    @Body() dto: ReviewKycDto,
  ) {
    return this.kycService.review(req.user.id, kycId, dto);
  }

  @Get('document')
  async getDocument(@Query('path') path: string) {
    if (!path) throw new BadRequestException('Document path is required');
    return {
      url: await this.kycService.getKycDocument(path),
    };
  }

  /**
   * Get user's highest approved KYC
   */
  @Get('me')
  async myKyc(@Req() req: any) {
    return this.kycService.getUserKyc(req.user.id);
  }

  @UseGuards(AdminGuard)
  @Get(':id')
  async getUserKycRecord(@Req() req: any, @Param('id') id: string) {
    return this.kycService.getUserKyc(id);
  }
  @UseGuards(AdminGuard)
  @Get('/admin/pending')
  async getpendingKycRecord() {
    return this.kycService.listAllKyc();
  }
}
