import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { InvestmentPlansService } from './investment-plans.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CreatePlanDto } from './dtos/create-plan.dto';
import { UpdatePlanDto } from './dtos/update-plan.dto';

@Controller('investment-plans')
export class InvestmentPlansController {
  constructor(private readonly service: InvestmentPlansService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @UseGuards(AdminGuard)
  @Post()
  create(@Body() dto: CreatePlanDto) {
    return this.service.create(dto);
  }

  @UseGuards(AdminGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.service.update(id, dto);
  }
}
