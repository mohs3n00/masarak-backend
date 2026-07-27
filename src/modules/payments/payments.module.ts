import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { WebhookController } from './webhook.controller';
import { PaymentsService } from './services/payments.service';
import { PaymobService } from './services/paymob.service';
import { CommerceModule } from '../commerce/commerce.module';
import { PrismaModule } from '../../database/prisma/prisma.module';

@Module({
  imports: [CommerceModule, PrismaModule],
  controllers: [PaymentsController, WebhookController],
  providers: [PaymentsService, PaymobService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
