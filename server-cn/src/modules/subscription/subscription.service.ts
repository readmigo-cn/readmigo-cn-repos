import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, MoreThan, Or, Repository } from 'typeorm';

import { CreateOrderDto } from './dto/create-order.dto.js';
import { ListOrdersDto } from './dto/list-orders.dto.js';
import { EntitlementEntity } from './entities/entitlement.entity.js';
import { PaymentOrderEntity } from './entities/payment-order.entity.js';
import { SubscriptionPlanEntity } from './entities/subscription-plan.entity.js';
import {
  SubscriptionEntity,
  type SubscriptionPlan,
  type SubscriptionStatus,
} from './entities/subscription.entity.js';

// ─── Plan seed data ─────────────────────────────────────────────────────────

interface PlanSeed {
  id: string;
  name: string;
  nameZh: string;
  billingCycle: string;
  priceYuan: number;  // 分
  priceUsd: number;   // 美分
  trialDays: number;
  sortOrder: number;
  features: Record<string, unknown>;
}

const DEFAULT_PLANS: PlanSeed[] = [
  {
    id: 'free',
    name: 'Free',
    nameZh: '免费版',
    billingCycle: 'lifetime',
    priceYuan: 0,
    priceUsd: 0,
    trialDays: 0,
    sortOrder: 0,
    features: { ai_chat: false, vocab_limit: 50, offline_read: false, full_content: false },
  },
  {
    id: 'pro_monthly',
    name: 'Pro Monthly',
    nameZh: 'Pro 月订阅',
    billingCycle: 'monthly',
    priceYuan: 3500,   // ¥35.00
    priceUsd: 499,     // $4.99
    trialDays: 3,
    sortOrder: 1,
    features: { ai_chat: true, vocab_limit: 500, offline_read: true, full_content: true },
  },
  {
    id: 'pro_yearly',
    name: 'Pro Yearly',
    nameZh: 'Pro 年订阅',
    billingCycle: 'yearly',
    priceYuan: 21300,  // ¥213.00
    priceUsd: 2999,    // $29.99
    trialDays: 7,
    sortOrder: 2,
    features: { ai_chat: true, vocab_limit: 500, offline_read: true, full_content: true },
  },
  {
    id: 'premium_monthly',
    name: 'Premium Monthly',
    nameZh: 'Premium 月订阅',
    billingCycle: 'monthly',
    priceYuan: 7100,   // ¥71.00
    priceUsd: 999,     // $9.99
    trialDays: 0,
    sortOrder: 3,
    features: { ai_chat: true, vocab_limit: -1, offline_read: true, full_content: true, priority_support: true },
  },
];

// ─── Plan → entitlement mapping ─────────────────────────────────────────────

interface EntitlementDef {
  feature: string;
  value: string;
}

const PLAN_ENTITLEMENTS: Record<string, EntitlementDef[]> = {
  free: [
    { feature: 'full_content_access', value: 'false' },
    { feature: 'max_ai_queries_per_day', value: '5' },
    { feature: 'offline_download', value: 'false' },
    { feature: 'vocab_limit', value: '50' },
  ],
  pro_monthly: [
    { feature: 'full_content_access', value: 'true' },
    { feature: 'max_ai_queries_per_day', value: '500' },
    { feature: 'offline_download', value: 'true' },
    { feature: 'vocab_limit', value: '500' },
  ],
  pro_yearly: [
    { feature: 'full_content_access', value: 'true' },
    { feature: 'max_ai_queries_per_day', value: '500' },
    { feature: 'offline_download', value: 'true' },
    { feature: 'vocab_limit', value: '500' },
  ],
  premium_monthly: [
    { feature: 'full_content_access', value: 'true' },
    { feature: 'max_ai_queries_per_day', value: '-1' },  // unlimited
    { feature: 'offline_download', value: 'true' },
    { feature: 'vocab_limit', value: '-1' },
    { feature: 'priority_support', value: 'true' },
  ],
};

// ─── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    @InjectRepository(SubscriptionEntity)
    private readonly subRepo: Repository<SubscriptionEntity>,
    @InjectRepository(SubscriptionPlanEntity)
    private readonly planRepo: Repository<SubscriptionPlanEntity>,
    @InjectRepository(PaymentOrderEntity)
    private readonly orderRepo: Repository<PaymentOrderEntity>,
    @InjectRepository(EntitlementEntity)
    private readonly entitlementRepo: Repository<EntitlementEntity>,
    private readonly cfg: ConfigService,
  ) {}

  // ── Plans ──────────────────────────────────────────────────────────────────

  async listPlans(): Promise<SubscriptionPlanEntity[]> {
    const count = await this.planRepo.count();
    if (count === 0) {
      await this._seedDefaultPlans();
    }
    return this.planRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }

  private async _seedDefaultPlans(): Promise<void> {
    this.logger.log('Seeding default subscription plans');
    for (const seed of DEFAULT_PLANS) {
      const plan = this.planRepo.create({
        id: seed.id,
        name: seed.name,
        nameZh: seed.nameZh,
        billingCycle: seed.billingCycle,
        priceYuan: seed.priceYuan,
        priceUsd: seed.priceUsd,
        currency: 'CNY',
        features: seed.features,
        trialDays: seed.trialDays,
        isActive: true,
        sortOrder: seed.sortOrder,
      });
      await this.planRepo.save(plan);
    }
  }

  // ── Subscription ───────────────────────────────────────────────────────────

  async getActive(userId: string): Promise<SubscriptionEntity | null> {
    return this.subRepo.findOne({
      where: { userId, status: 'active' as SubscriptionStatus },
      order: { expiresAt: 'DESC' },
    });
  }

  /** Alias kept for controller symmetry */
  async getCurrentSubscription(userId: string): Promise<SubscriptionEntity | null> {
    return this.getActive(userId);
  }

  async cancelSubscription(userId: string, reason?: string): Promise<void> {
    const active = await this.getActive(userId);
    if (!active) return;
    active.autoRenew = false;
    await this.subRepo.save(active);
    this.logger.log(`User ${userId} cancelled auto-renew. Reason: ${reason ?? 'n/a'}`);
  }

  // ── Orders ─────────────────────────────────────────────────────────────────

  async createOrder(
    userId: string,
    dto: CreateOrderDto,
  ): Promise<{ orderId: string; amountYuan: number; source: string }> {
    // Ensure plans are seeded
    const count = await this.planRepo.count();
    if (count === 0) await this._seedDefaultPlans();

    const plan = await this.planRepo.findOne({ where: { id: dto.planCode, isActive: true } });
    if (!plan) {
      throw new NotFoundException(`Plan "${dto.planCode}" not found or inactive`);
    }

    const orderNo = `RM${Date.now()}${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const order = this.orderRepo.create({
      userId,
      planId: plan.id,
      orderNo,
      provider: dto.source,
      amountYuan: plan.priceYuan,
      currency: 'CNY',
      status: 'pending',
    });
    const saved = await this.orderRepo.save(order);
    return { orderId: saved.id, amountYuan: saved.amountYuan, source: saved.provider };
  }

  async listOrders(
    userId: string,
    dto: ListOrdersDto,
  ): Promise<{ items: PaymentOrderEntity[]; total: number; page: number; limit: number }> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const [items, total] = await this.orderRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }

  async requestRefund(userId: string, orderId: string, reason: string): Promise<PaymentOrderEntity> {
    const order = await this.orderRepo.findOne({ where: { id: orderId, userId } });
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }
    order.status = 'refunded';
    order.refundedAt = new Date();
    order.refundAmount = order.amountYuan;
    this.logger.log(`Refund requested for order ${orderId} by user ${userId}. Reason: ${reason}`);
    return this.orderRepo.save(order);
  }

  // ── IAP / Payment verification (mock) ──────────────────────────────────────

  /**
   * 验证 HMS IAP 收据并写入订阅记录。
   * Phase 4 实装：需调用华为 Order Service API 二次验签。
   */
  async verifyAndRecord(
    userId: string,
    productId: string,
    plan: SubscriptionPlan,
    purchaseToken: string,
    rawReceipt: string,
  ): Promise<SubscriptionEntity> {
    const isDev = this.cfg.get<string>('NODE_ENV') !== 'production';
    const verified = isDev ? true : await this._verifyHmsIapReceipt(rawReceipt);

    if (!verified) {
      const failed = this.subRepo.create({
        userId,
        plan,
        status: 'failed',
        provider: 'hms-iap',
        productId,
        purchaseToken,
        rawReceipt,
      });
      return this.subRepo.save(failed);
    }

    const durationDays = this._planDurationDays(plan);
    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + durationDays * 86400_000);

    const sub = this.subRepo.create({
      userId,
      plan,
      status: 'active',
      provider: 'hms-iap',
      productId,
      purchaseToken,
      rawReceipt,
      startedAt,
      expiresAt,
      autoRenew: true,
    });
    const saved = await this.subRepo.save(sub);
    await this._grantEntitlements(userId, plan, expiresAt, saved.id);
    return saved;
  }

  async verifyHmsIap(
    userId: string,
    orderId: string,
    hmsReceipt: string,
  ): Promise<{ ok: boolean; orderId: string }> {
    this.logger.log(`HMS IAP verify — user=${userId} order=${orderId} receipt_len=${hmsReceipt.length}`);
    const order = await this.orderRepo.findOne({ where: { id: orderId, userId } });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    order.status = 'paid';
    order.paidAt = new Date();
    order.rawPayload = hmsReceipt;
    await this.orderRepo.save(order);

    await this._activateSubscriptionFromOrder(userId, order);
    return { ok: true, orderId };
  }

  async verifyWechatPay(
    userId: string,
    orderId: string,
    transactionId: string,
  ): Promise<{ ok: boolean; orderId: string }> {
    this.logger.log(`WeChat Pay verify — user=${userId} order=${orderId} txn=${transactionId}`);
    const order = await this.orderRepo.findOne({ where: { id: orderId, userId } });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    order.status = 'paid';
    order.paidAt = new Date();
    order.externalOrderNo = transactionId;
    await this.orderRepo.save(order);

    await this._activateSubscriptionFromOrder(userId, order);
    return { ok: true, orderId };
  }

  async verifyAlipay(
    userId: string,
    orderId: string,
    transactionId: string,
  ): Promise<{ ok: boolean; orderId: string }> {
    this.logger.log(`Alipay verify — user=${userId} order=${orderId} txn=${transactionId}`);
    const order = await this.orderRepo.findOne({ where: { id: orderId, userId } });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    order.status = 'paid';
    order.paidAt = new Date();
    order.externalOrderNo = transactionId;
    await this.orderRepo.save(order);

    await this._activateSubscriptionFromOrder(userId, order);
    return { ok: true, orderId };
  }

  // ── Entitlements ──────────────────────────────────────────────────────────

  async getUserEntitlements(userId: string): Promise<EntitlementEntity[]> {
    const now = new Date();
    return this.entitlementRepo.find({
      where: [
        { userId, expiresAt: IsNull(), revokedAt: IsNull() },
        { userId, expiresAt: MoreThan(now), revokedAt: IsNull() },
      ],
      order: { feature: 'ASC' },
    });
  }

  // ── Internal helpers ──────────────────────────────────────────────────────

  private async _activateSubscriptionFromOrder(userId: string, order: PaymentOrderEntity): Promise<void> {
    const plan = order.planId as SubscriptionPlan;
    const durationDays = this._planDurationDays(plan);
    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + durationDays * 86400_000);

    const sub = this.subRepo.create({
      userId,
      plan,
      status: 'active',
      provider: order.provider as any,
      startedAt,
      expiresAt,
      autoRenew: true,
    });
    const saved = await this.subRepo.save(sub);

    order.subscriptionId = saved.id;
    await this.orderRepo.save(order);

    await this._grantEntitlements(userId, plan, expiresAt, saved.id);
  }

  private async _grantEntitlements(
    userId: string,
    planCode: string,
    expiresAt: Date,
    subscriptionId: string,
  ): Promise<void> {
    const defs = PLAN_ENTITLEMENTS[planCode] ?? PLAN_ENTITLEMENTS['free'];
    for (const def of defs) {
      // Upsert: conflicting (userId, feature) → update value + expiresAt
      await this.entitlementRepo
        .createQueryBuilder()
        .insert()
        .into(EntitlementEntity)
        .values({
          userId,
          subscriptionId,
          feature: def.feature,
          value: def.value,
          expiresAt,
          revokedAt: undefined,
        })
        .orUpdate(['value', 'expiresAt', 'subscriptionId', 'revokedAt'], ['userId', 'feature'])
        .execute();
    }
    this.logger.log(`Granted ${defs.length} entitlements for user ${userId} plan ${planCode}`);
  }

  private _planDurationDays(plan: string): number {
    const map: Record<string, number> = {
      pro_monthly: 30,
      pro_yearly: 365,
      premium_monthly: 30,
      free: 0,
    };
    return map[plan] ?? 30;
  }

  private async _verifyHmsIapReceipt(_rawReceipt: string): Promise<boolean> {
    this.logger.warn('HMS IAP receipt verification stubbed — implement in Phase 4');
    return false;
  }

  // Legacy alias used by existing cancel endpoint
  async cancel(userId: string): Promise<void> {
    return this.cancelSubscription(userId);
  }
}
