import { SupabaseModule } from 'src/supabase/supabase.module';
import { NotificationService } from './notification.service';
import { NotificationController } from './notifications.controller';
import { Module } from '@nestjs/common';
import { EmailTemplate } from 'src/helpers/email-template.helper';

@Module({
  imports: [SupabaseModule],
  controllers: [NotificationController],
  providers: [NotificationService, EmailTemplate],
})
export class NotificationsModule {}
