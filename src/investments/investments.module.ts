import { Module } from '@nestjs/common';
import { LedgerService } from 'src/ledger/ledger.service';
import { InvestmentsController } from './investment.controller';
import { InvestmentsService } from './investment.service';

@Module({
  controllers: [InvestmentsController],
  providers: [InvestmentsService, LedgerService],
})
export class InvestmentsModule {}
