import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser, type CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { VerifyIapDto } from './dto/verify-iap.dto.js';
import { SubscriptionService } from './subscription.service.js';

@ApiTags('subscription')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subs: SubscriptionService) {}

  @Get('me')
  async me(@CurrentUser() user: CurrentUserPayload) {
    const active = await this.subs.getActive(user.id);
    return {
      isPro: !!active,
      subscription: active ?? null,
    };
  }

  @Post('verify')
  verify(@CurrentUser() user: CurrentUserPayload, @Body() dto: VerifyIapDto) {
    return this.subs.verifyAndRecord(user.id, dto.productId, dto.plan, dto.purchaseToken, dto.rawReceipt);
  }

  @Post('cancel')
  async cancel(@CurrentUser() user: CurrentUserPayload) {
    await this.subs.cancel(user.id);
    return { ok: true };
  }
}
