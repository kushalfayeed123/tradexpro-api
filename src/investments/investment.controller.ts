/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Req,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CreateInvestmentDto } from './dtos/create-investment.dto';
import { InvestmentsService } from './investment.service';
import { UpdateAccruedReturnDto } from './dtos/update-accrued-returns.dto';
import { RequireKyc } from 'src/kyc/kyc.decorator';
import { KycGuard } from 'src/kyc/guards/kyc.guard';

@UseGuards(JwtAuthGuard)
@Controller('investments')
export class InvestmentsController {
  constructor(private readonly service: InvestmentsService) {}

  @UseGuards(KycGuard)
  @RequireKyc(1)
  @Post()
  create(@Req() req: any, @Body() dto: CreateInvestmentDto) {
    return this.service.create(req.user.id, dto);
  }

  @Get('me')
  findUserInvestments(@Req() req: any) {
    return this.service.findUserInvestments(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @UseGuards(AdminGuard)
  @Post(':id/mature')
  matureInvestment(@Param('id') id: string, @Req() req: any) {
    return this.service.matureInvestment(req.user.id, id);
  }

  @UseGuards(AdminGuard)
  @Patch('return')
  updateAccruedReturn(@Body() dto: UpdateAccruedReturnDto) {
    return this.service.updateAccruedReturn(dto);
  }

  @UseGuards(AdminGuard)
  @Get('me')
  getAll() {
    return this.service.getAllInvestments();
  }
}
