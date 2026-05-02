import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import {
  CurrentUser,
  type CurrentUserPayload,
} from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { ListOrdersDto } from './dto/list-orders.dto.js';
import { VerifyIapDto } from './dto/verify-iap.dto.js';
import { SubscriptionService } from './subscription.service.js';

@ApiTags('subscription')
@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subs: SubscriptionService) {}

  // ── Public ────────────────────────────────────────────────────────────────

  /** GET /subscription/plans — list active plans (no auth required) */
  @Get('plans')
  listPlans() {
    return this.subs.listPlans();
  }

  // ── Auth-required routes ──────────────────────────────────────────────────

  /** GET /subscription/me — current user's active subscription */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: CurrentUserPayload) {
    const subscription = await this.subs.getCurrentSubscription(user.id);
    return { isPro: !!subscription, subscription: subscription ?? null };
  }

  /** GET /subscription/entitlements — current user's active entitlements */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('entitlements')
  entitlements(@CurrentUser() user: CurrentUserPayload) {
    return this.subs.getUserEntitlements(user.id);
  }

  /** GET /subscription/orders — paginated order history */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('orders')
  listOrders(@CurrentUser() user: CurrentUserPayload, @Query() dto: ListOrdersDto) {
    return this.subs.listOrders(user.id, dto);
  }

  /** POST /subscription/orders — create a pending payment order */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('orders')
  createOrder(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateOrderDto) {
    return this.subs.createOrder(user.id, dto);
  }

  /**
   * POST /subscription/orders/:id/verify — confirm payment & activate subscription.
   * Body shape differs by source but we unify via VerifyIapDto fields when
   * the provider is hms-iap; for wechat-pay / alipay the client sends { source, transactionId }.
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('orders/:id/verify')
  async verifyOrder(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') orderId: string,
    @Body() body: { source: string; transactionId?: string; rawReceipt?: string },
  ) {
    if (body.source === 'hms-iap') {
      return this.subs.verifyHmsIap(user.id, orderId, body.rawReceipt ?? '');
    }
    if (body.source === 'wechat-pay') {
      return this.subs.verifyWechatPay(user.id, orderId, body.transactionId ?? '');
    }
    if (body.source === 'alipay') {
      return this.subs.verifyAlipay(user.id, orderId, body.transactionId ?? '');
    }
    return { ok: false, error: 'Unknown payment source' };
  }

  /** POST /subscription/orders/:id/refund — request refund */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('orders/:id/refund')
  refund(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') orderId: string,
    @Body('reason') reason: string,
  ) {
    return this.subs.requestRefund(user.id, orderId, reason ?? '');
  }

  /** POST /subscription/cancel — disable auto-renew */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('cancel')
  async cancel(@CurrentUser() user: CurrentUserPayload) {
    await this.subs.cancel(user.id);
    return { ok: true };
  }

  // ── Legacy endpoint (backward compat) ─────────────────────────────────────

  /** POST /subscription/verify — original HMS IAP direct verify */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('verify')
  verify(@CurrentUser() user: CurrentUserPayload, @Body() dto: VerifyIapDto) {
    return this.subs.verifyAndRecord(user.id, dto.productId, dto.plan, dto.purchaseToken, dto.rawReceipt);
  }
}
