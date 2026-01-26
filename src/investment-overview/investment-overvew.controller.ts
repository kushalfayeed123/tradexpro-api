/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Get,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';
import { OverviewService } from './investment-overview.service';

@Controller('overview')
@UseGuards(JwtAuthGuard)
export class OverviewController {
  constructor(private readonly overviewService: OverviewService) {}

  /**
   * GET /overview/summary
   * Fetches the aggregated financial data for the dashboard
   */
  @Get('summary')
  @HttpCode(HttpStatus.OK)
  async getDashboardSummary(@Request() req) {
    // The userId is extracted from the JWT payload by the JwtAuthGuard
    const userId = req.user.id;

    return await this.overviewService.getUserDashboardSummary(userId);
  }
}
