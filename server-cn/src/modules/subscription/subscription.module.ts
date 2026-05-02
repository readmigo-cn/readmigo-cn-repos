import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { EntitlementEntity } from './entities/entitlement.entity.js';
import { PaymentOrderEntity } from './entities/payment-order.entity.js';
import { SubscriptionPlanEntity } from './entities/subscription-plan.entity.js';
import { SubscriptionEntity } from './entities/subscription.entity.js';
import { SubscriptionController } from './subscription.controller.js';
import { SubscriptionService } from './subscription.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SubscriptionEntity,
      SubscriptionPlanEntity,
      PaymentOrderEntity,
      EntitlementEntity,
    ]),
  ],
  controllers: [SubscriptionController],
  providers: [SubscriptionService, JwtAuthGuard],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
