/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
// src/transactions/transactions.controller.ts
import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dtos/create-transaction.dto';
import { RequireKyc } from 'src/kyc/kyc.decorator';
import { KycGuard } from 'src/kyc/guards/kyc.guard';
import { AdminGuard } from 'src/auth/guards/admin.guard';

@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}
  @UseGuards(KycGuard)
  @Post()
  @RequireKyc(1)
  create(@Req() req, @Body() dto: CreateTransactionDto) {
    return this.service.create(req.user.id, dto);
  }

  @Get()
  list(@Req() req) {
    return this.service.list(req.user.id);
  }

  @UseGuards(AdminGuard)
  @Get()
  listAll() {
    return this.service.getAllTransactions();
  }
}
