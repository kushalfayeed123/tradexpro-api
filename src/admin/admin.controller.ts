/* eslint-disable @typescript-eslint/no-unsafe-return */
// src/deposit-methods/deposit-methods.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateDepositMethodDto } from './dtos/deposit-method.dto';
import { AdminGuard } from 'src/auth/guards/admin.guard';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get('active')
  findActive() {
    return this.service.findActive();
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() dto: CreateDepositMethodDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateDepositMethodDto>,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @UseGuards(AdminGuard) // Ensure you have an AdminGuard protecting this!
  @Get('/dashboard/summary')
  async getSummary() {
    return await this.service.getDashboardSummary();
  }
}
