/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// notification.service.ts
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Resend } from 'resend';
import { EmailTemplate } from 'src/helpers/email-template.helper';
import twilio from 'twilio';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private twilioClient: any;
  private resend: Resend = new Resend();

  constructor(
    @Inject('SUPABASE_CLIENT') private supabase,
    private emailTemplate: EmailTemplate,
  ) {}

  onModuleInit() {
    // Initialize clients here to ensure Env vars are loaded
    const resendKey = process.env.RESEND_API_KEY;
    const twilioSid = process.env.TWILIO_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;

    if (!resendKey) {
      this.logger.error(
        'RESEND_API_KEY is missing from environment variables!',
      );
    } else {
      this.resend = new Resend(resendKey);
    }

    if (twilioSid && twilioToken) {
      this.twilioClient = twilio(twilioSid, twilioToken);
    }
  }

  async sendEmail(
    userId: string,
    email: string,
    subject: string,
    content: string,
  ) {
    const { data: log, error } = await this.supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'email',
        provider: 'resend',
        recipient: email,
        subject,
        content,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.log('Supabase Email Insert Error:', error);
      throw new InternalServerErrorException('Could not log notification');
    }

    try {
      const htmlPayload = this.emailTemplate.getEmailWrapper(content);
      const response = await this.resend.emails.send({
        from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
        to: email,
        subject,
        html: htmlPayload,
      });

      await this.supabase
        .from('notifications')
        .update({ status: 'sent', meta: response })
        .eq('id', log.id);
      return response;
    } catch (err) {
      await this.supabase
        .from('notifications')
        .update({ status: 'failed', meta: { error: err } })
        .eq('id', log.id);
      throw new InternalServerErrorException('Email delivery failed');
    }
  }

  async sendSMS(userId: string, phone: string, message: string) {
    // 1. Log to DB as 'pending'
    const { data: log, error } = await this.supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'sms',
        provider: 'twilio',
        recipient: phone,
        content: message,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.log('Supabase SMS Insert Error:', error);
      throw new InternalServerErrorException('Could not log notification');
    }
    try {
      // 2. Attempt Twilio Send
      const response = await this.twilioClient.messages.create({
        body: message,
        to: phone,
        messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_ID,

        from: process.env.TWILIO_PHONE_NUMBER,
      });

      // 3. Update DB to 'sent'
      await this.supabase
        .from('notifications')
        .update({ status: 'sent', meta: { sid: response.sid } })
        .eq('id', log.id);

      return response;
    } catch (err) {
      // 4. Update DB to 'failed'
      await this.supabase
        .from('notifications')
        .update({ status: 'failed', meta: { error: err } })
        .eq('id', log.id);
      throw new InternalServerErrorException('SMS delivery failed');
    }
  }

  async generateOTP(userId: string, type: string) {
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 min expiry

    await this.supabase.from('otp_codes').insert({
      user_id: userId,
      code,
      type,
      expires_at: expiresAt,
    });

    return code;
  }

  // --- The "DB Trigger" (Queue Processor) ---
  // This runs every minute to process any stuck or "pending" notifications
  // that weren't sent immediately.

  @Cron(CronExpression.EVERY_MINUTE)
  async processNotificationQueue() {
    // 1. Fetch pending notifications
    const { data: pending, error: fetchError } = await this.supabase
      .from('notifications')
      .select('*')
      .eq('status', 'pending')
      .limit(10);

    if (fetchError || !pending || pending.length === 0) return;

    this.logger.log(`Processing ${pending.length} pending notifications...`);

    for (const item of pending) {
      try {
        // 2. Mark as 'processing' immediately to prevent duplicate sends from other cron ticks
        await this.supabase
          .from('notifications')
          .update({ status: 'processing' })
          .eq('id', item.id);

        // 3. Dispatch based on type
        if (item.type === 'sms') {
          await this.sendSMS(item.user_id, item.recipient, item.content);
        } else if (item.type === 'email') {
          await this.sendEmail(
            item.user_id,
            item.recipient,
            item.subject || 'Notification',
            item.content,
          );
        }

        // 4. Update to 'sent' ONLY if the methods above didn't throw an error
        await this.supabase
          .from('notifications')
          .update({
            status: 'sent',
            meta: { processed_at: new Date().toISOString() },
          })
          .eq('id', item.id);
      } catch (e) {
        this.logger.error(
          `Failed to process queued notification ${item.id}: ${e}`,
        );

        // 5. Mark as 'failed' so it stops clogging the 'pending' queue
        await this.supabase
          .from('notifications')
          .update({
            status: 'failed',
            meta: { error: e, failed_at: new Date().toISOString() },
          })
          .eq('id', item.id);
      }
    }
  }

  async getLogs(page: number) {
    const from = (page - 1) * 10;
    const to = from + 9;
    return await this.supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);
  }

  async requestOTP(
    userId: string,
    recipientemail: string,
    recipientNumber: string,
    type: string,
  ) {
    const code = await this.generateOTP(userId, type);
    const message = `Your TopEquity security code is: ${code}. Valid for 10 minutes.`;
    await this.sendSMS(userId, recipientNumber, message);
    await this.sendEmail(
      userId,
      recipientemail,
      'Verification Code',
      this.emailTemplate.otp(code),
    );
  }

  /**
   * Enqueues an email to be sent by the background worker (Cron)
   */
  async enqueueEmail(
    userId: string,
    email: string,
    subject: string,
    content: string,
  ) {
    const { error } = await this.supabase.from('notifications').insert({
      user_id: userId,
      type: 'email',
      provider: 'resend',
      recipient: email,
      subject,
      content,
      status: 'pending',
    });

    if (error) {
      this.logger.error(`Failed to enqueue email: ${error.message}`);
    }
  }

  /**
   * Enqueues an SMS to be sent by the background worker
   */
  async enqueueSMS(userId: string, phone: string, message: string) {
    await this.supabase.from('notifications').insert({
      user_id: userId,
      type: 'sms',
      provider: 'twilio',
      recipient: phone,
      content: message,
      status: 'pending',
    });
  }
}
