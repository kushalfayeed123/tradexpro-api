/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
// src/wallets/wallets.controller.ts
import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';
import { CreateWalletDto } from './wallet.dto';
import { WalletsService } from './wallet.service';

@UseGuards(JwtAuthGuard)
@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get('me')
  getMyWallet(@Req() req) {
    return this.walletsService.getByUserId(req.user.id);
  }

  @Post()
  createWallet(@Req() req, @Body() dto: CreateWalletDto) {
    return this.walletsService.create(req.user.id, dto.currency);
  }
}
