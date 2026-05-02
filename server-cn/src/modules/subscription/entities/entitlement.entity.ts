import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type EntitlementSource = 'subscription' | 'promo' | 'internal';

/**
 * Entitlement — 权益快照表
 * 对应 migration 1714522700000-SubscriptionV2 创建的 entitlements 表。
 *
 * 每个 (userId, feature) 对唯一（由 DB UNIQUE 约束保证）。
 * value 存为字符串，调用方按需解析：
 *   布尔权益  → "true" / "false"
 *   数量限制  → "500" (stringify int)
 *   revokedAt 非 null 表示权益已撤销（软删除语义）。
 */
@Entity('entitlements')
@Index(['userId', 'feature'], { unique: true })
export class EntitlementEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('uuid')
  userId!: string;

  /** 关联 user_subscriptions.id，可为空（促销/内部权益） */
  @Column({ type: 'uuid', nullable: true, name: 'subscriptionId' })
  subscriptionId!: string | null;

  /**
   * 权益标识，如：
   *   ai_chat / vocab_unlimited / offline_read /
   *   max_ai_queries_per_day / full_content_access
   */
  @Column({ length: 50 })
  feature!: string;

  /**
   * 权益值，布尔用 "true"/"false"，数量限制用数字字符串。
   */
  @Column({ length: 200, default: 'true' })
  value!: string;

  /** NULL 表示永久权益（如终身会员） */
  @Index({ where: '"expiresAt" IS NOT NULL AND "revokedAt" IS NULL' })
  @Column({ type: 'timestamptz', nullable: true, name: 'expiresAt' })
  expiresAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'grantedAt' })
  grantedAt!: Date;

  /** 非 NULL 表示已撤销（软删除） */
  @Column({ type: 'timestamptz', nullable: true, name: 'revokedAt' })
  revokedAt!: Date | null;
}
