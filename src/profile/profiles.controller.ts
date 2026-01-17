/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Body,
  Controller,
  Get,
  Inject,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('profiles')
export class ProfilesController {
  constructor(@Inject('SUPABASE_CLIENT') private supabase) {}

  @Get('me')
  async getProfile(@Req() req) {
    const { data } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    return data;
  }

  @Put('me')
  async updateProfile(@Req() req, @Body() dto) {
    const { data } = await this.supabase
      .from('profiles')
      .update(dto)
      .eq('user_id', req.user.id)
      .select()
      .single();

    return data;
  }
}
