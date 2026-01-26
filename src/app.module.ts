import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './user/users.module';
import { ProfilesModule } from './profile/profiles.module';
import { WalletsModule } from './wallet/wallet.module';
import { TransactionsModule } from './transactions/transactions.module';
import { AdminModule } from './admin/admin.module';
import { LedgerModule } from './ledger/ledger.module';
import { InvestmentPlansModule } from './investment-plans/investment-plans.module';
import { InvestmentsModule } from './investments/investments.module';
import { KycModule } from './kyc/kyc.module';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsModule } from './notifications/notification.module';
import { InvestmentOverviewModule } from './investment-overview/investment-overview.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UsersModule,
    ProfilesModule,
    WalletsModule,
    TransactionsModule,
    AdminModule,
    LedgerModule,
    InvestmentPlansModule,
    InvestmentsModule,
    KycModule,
    ScheduleModule.forRoot(),
    NotificationsModule,
    InvestmentOverviewModule,
  ],
})
export class AppModule {}
