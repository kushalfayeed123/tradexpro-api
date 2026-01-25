/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { AdminGuard } from '../auth/guards/admin.guard'; // Assuming you have one
import { EmailTemplate } from 'src/helpers/email-template.helper';

@Controller('notifications')
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(
    private readonly service: NotificationService,
    private emailTemplate: EmailTemplate,
  ) {}

  @UseGuards(AdminGuard)
  @Get('logs')
  async getLogs(@Query('page') page = 1) {
    // Basic log fetching for admin dashboard
    return await this.service.getLogs(page);
  }

  /**
   * Request an OTP (Email or SMS)
   */
  @Post('otp/request')
  async requestOTP(
    @Body()
    body: {
      userId: string;
      email: string;
      phone: string;
      type: string;
    },
  ) {
    const code = await this.service.generateOTP(body.userId, body.type);
    const smsMessage = `Your TopEquity security code is: ${code}. Valid for 10 minutes.`;
    const emailHtml = this.emailTemplate.otp(code);

    this.service.sendSMS(body.userId, body.phone, smsMessage).catch((err) => {
      this.logger.error(`Background SMS failed for ${body.userId}: ${err}`);
    });

    // Fire Email in background - No 'await'
    this.service
      .sendEmail(body.userId, body.email, 'Verification Code', emailHtml)
      .catch((err) => {
        this.logger.error(`Background Email failed for ${body.userId}: ${err}`);
      });

    // Respond to the user immediately
    return {
      success: true,
      message: 'Verification codes are being dispatched.',
    };
  }

  /**
   * Admin-only: Send a custom notification to a specific user
   */
  @UseGuards(AdminGuard)
  @Post('send-custom')
  async sendCustom(
    @Body()
    body: {
      userId: string;
      type: 'sms' | 'email';
      recipient: string;
      content: string;
      subject?: string;
    },
  ) {
    if (body.type === 'sms') {
      return this.service.sendSMS(body.userId, body.recipient, body.content);
    }
    return this.service.sendEmail(
      body.userId,
      body.recipient,
      body.subject || 'System Notification',
      body.content,
    );
  }

  @Post('welcome')
  async sendWelcomeEmail(
    @Body()
    body: {
      userId: string;
      type: 'email';
      recipient: string;
      content: string;
      subject?: string;
      userName: string;
    },
  ) {
    return this.service.sendEmail(
      body.userId,
      body.recipient,
      body.subject || 'System Notification',
      this.emailTemplate.welcome(body.userName),
    );
  }
}
