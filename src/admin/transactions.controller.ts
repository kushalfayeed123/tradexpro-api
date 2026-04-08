/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  UseGuards,
  Controller,
  Post,
  Req,
  Param,
  Body,
  Get,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { AdminGuard } from 'src/auth/guards/admin.guard';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';
import { TransactionsService } from 'src/transactions/transactions.service';
import { AdminUpdateBalanceDto } from './dtos/admin-update-balance.dto';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/transactions')
export class AdminTransactionsController {
  constructor(private readonly service: TransactionsService) {}

  @Post(':id/approve')
  async approve(@Req() req, @Param('id') id: string) {
    return this.service.approveTransaction(req.user.id, id);
  }

  @Post(':id/reject')
  async reject(@Req() req, @Param('id') id: string) {
    return this.service.rejectTransaction(req.user.id, id);
  }

  @Post(':id/reverse')
  reverse(@Req() req, @Param('id') id: string) {
    return this.service.reverseTransaction(req.user.id, id);
  }

  @Get()
  listAll(@Query() query: any) {
    return this.service.getAllTransactions(query);
  }

  @Get('stats')
  getStats() {
    return this.service.getStats();
  }

  @Post('update-balance')
  async updateBalance(@Req() req: any, @Body() dto: AdminUpdateBalanceDto) {
    // Extract Admin ID from the authenticated request
    const adminId = req.user?.id ?? '';

    if (!adminId) {
      throw new BadRequestException('Admin identity could not be verified.');
    }

    if (!dto.userId || dto.amount === 0) {
      throw new BadRequestException('Invalid User ID or Amount');
    }

    return await this.service.adminUpdateBalance(
      adminId,
      dto.userId,
      dto.amount,
      dto.description ?? 'Admin Update',
    );
  }
}
