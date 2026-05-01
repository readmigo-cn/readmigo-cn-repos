import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  SubscriptionEntity,
  type SubscriptionPlan,
  type SubscriptionStatus,
} from './entities/subscription.entity.js';

const PLAN_DURATION_DAYS: Record<SubscriptionPlan, number> = {
  pro_monthly: 30,
  pro_yearly: 365,
  premium_monthly: 30,
};

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    @InjectRepository(SubscriptionEntity) private readonly repo: Repository<SubscriptionEntity>,
    private readonly cfg: ConfigService,
  ) {}

  async getActive(userId: string): Promise<SubscriptionEntity | null> {
    return this.repo.findOne({
      where: { userId, status: 'active' as SubscriptionStatus },
      order: { expiresAt: 'DESC' },
    });
  }

  /**
   * 验证 HMS IAP 收据并写入订阅记录。
   * 当前实现：dev 模式直接信任、记录；生产模式需要调用 HMS Order Service API 二次验签。
   * 真实接入待 Phase 4。
   */
  async verifyAndRecord(
    userId: string,
    productId: string,
    plan: SubscriptionPlan,
    purchaseToken: string,
    rawReceipt: string,
  ): Promise<SubscriptionEntity> {
    const isDev = this.cfg.get<string>('NODE_ENV') !== 'production';
    const verified = isDev ? true : await this.verifyHmsIapReceipt(rawReceipt);

    if (!verified) {
      const failed = this.repo.create({
        userId,
        plan,
        status: 'failed',
        provider: 'hms-iap',
        productId,
        purchaseToken,
        rawReceipt,
      });
      return this.repo.save(failed);
    }

    const days = PLAN_DURATION_DAYS[plan] ?? 30;
    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + days * 24 * 3600 * 1000);

    const sub = this.repo.create({
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
    return this.repo.save(sub);
  }

  /**
   * 真实 HMS IAP 二次验签需要：
   *   1. 拿 HMS Account Kit access token
   *   2. POST https://orders-drcn.iap.hicloud.com/applications/v2/purchases/get
   *   3. 校验签名 + purchaseState=0 + productId 匹配
   * Phase 4 实装。
   */
  private async verifyHmsIapReceipt(_rawReceipt: string): Promise<boolean> {
    this.logger.warn('HMS IAP verification stubbed — implement in Phase 4');
    return false;
  }

  async cancel(userId: string): Promise<void> {
    const active = await this.getActive(userId);
    if (!active) return;
    active.status = 'cancelled';
    active.autoRenew = false;
    await this.repo.save(active);
  }
}
