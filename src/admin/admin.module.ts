import { Module } from '@nestjs/common';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { AdminTransactionsController } from './transactions.controller';
import { TransactionsService } from 'src/transactions/transactions.service';
import { LedgerModule } from 'src/ledger/ledger.module';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { NotificationService } from 'src/notifications/notification.service';
import { EmailTemplate } from 'src/helpers/email-template.helper';
import { PromotionService } from 'src/promotion/promotion.service';

@Module({
  imports: [SupabaseModule, LedgerModule],
  controllers: [AdminTransactionsController, AdminController],
  providers: [
    TransactionsService,
    AdminService,
    NotificationService,
    EmailTemplate,
    PromotionService,
  ],
  exports: [TransactionsService],
})
export class AdminModule {}
