import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * SubscriptionPlan — 套餐定义表
 * 对应 migration 1714522700000-SubscriptionV2 创建的 subscription_plans 表。
 * priceYuan / priceUsd 均以分为单位存储。
 */
@Entity('subscription_plans')
export class SubscriptionPlanEntity {
  /** 套餐唯一标识，如 free / pro_monthly / pro_yearly / premium_monthly */
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id!: string;

  @Column({ length: 100 })
  name!: string;

  @Column({ length: 100, nullable: true })
  nameZh!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  /** monthly / yearly / lifetime */
  @Column({ length: 20, default: 'monthly' })
  billingCycle!: string;

  /** 价格（分），人民币 */
  @Column({ type: 'integer', default: 0 })
  priceYuan!: number;

  /** 价格（美分），美元 */
  @Column({ type: 'integer', default: 0 })
  priceUsd!: number;

  @Column({ length: 3, default: 'CNY' })
  currency!: string;

  /** 华为 HMS IAP 商品 ID */
  @Column({ length: 100, nullable: true })
  productIdHms!: string | null;

  @Column({ length: 100, nullable: true })
  productIdApple!: string | null;

  @Column({ length: 100, nullable: true })
  productIdGoogle!: string | null;

  /**
   * 权限集合 JSON，如 {"ai_chat": true, "vocab_limit": 500}
   * 存为 jsonb，读取时直接 parse。
   */
  @Column({ type: 'jsonb', default: {} })
  features!: Record<string, unknown>;

  /** 免费试用天数，0 表示无试用 */
  @Column({ type: 'smallint', default: 0 })
  trialDays!: number;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ type: 'integer', default: 0, name: 'sortOrder' })
  sortOrder!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
