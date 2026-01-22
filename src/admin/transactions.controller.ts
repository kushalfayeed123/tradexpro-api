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
} from '@nestjs/common';
import { AdminGuard } from 'src/auth/guards/admin.guard';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';
import { TransactionsService } from 'src/transactions/transactions.service';

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
}
