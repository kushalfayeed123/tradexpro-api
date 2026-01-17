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
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CreateInvestmentDto } from './dtos/create-investment.dto';
import { InvestmentsService } from './investment.service';

@UseGuards(JwtAuthGuard)
@Controller('investments')
export class InvestmentsController {
  constructor(private readonly service: InvestmentsService) {}

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
}
