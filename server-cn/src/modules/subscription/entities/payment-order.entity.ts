import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type PaymentOrderStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';
export type PaymentProvider = 'hms-iap' | 'wechat-pay' | 'alipay' | 'manual';

/**
 * PaymentOrder — 支付订单表
 * 对应 migration 1714522700000-SubscriptionV2 创建的 payment_orders 表。
 * amountYuan 以分为单位，与 DB 保持一致。
 */
@Entity('payment_orders')
export class PaymentOrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('uuid')
  userId!: string;

  /** 关联套餐 ID */
  @Column({ type: 'varchar', length: 50, name: 'planId' })
  planId!: string;

  /** 关联 user_subscriptions.id，支付成功后回填 */
  @Column({ type: 'uuid', nullable: true, name: 'subscriptionId' })
  subscriptionId!: string | null;

  /** 内部订单号，全局唯一 */
  @Column({ length: 100, unique: true, name: 'orderNo' })
  orderNo!: string;

  /** 三方支付平台订单号 */
  @Column({ length: 200, nullable: true, name: 'externalOrderNo' })
  externalOrderNo!: string | null;

  /** hms-iap / wechat-pay / alipay / manual */
  @Column({ length: 20 })
  provider!: PaymentProvider;

  /** 实付金额（分），人民币 */
  @Index()
  @Column({ type: 'integer', default: 0, name: 'amountYuan' })
  amountYuan!: number;

  @Column({ length: 3, default: 'CNY' })
  currency!: string;

  /** pending / paid / failed / refunded / cancelled */
  @Index()
  @Column({ length: 20, default: 'pending' })
  status!: PaymentOrderStatus;

  @Column({ type: 'timestamptz', nullable: true, name: 'paidAt' })
  paidAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'refundedAt' })
  refundedAt!: Date | null;

  /** 退款金额（分） */
  @Column({ type: 'integer', default: 0, name: 'refundAmount' })
  refundAmount!: number;

  /** 三方回调原始报文，用于对账 */
  @Column({ type: 'text', nullable: true, name: 'rawPayload' })
  rawPayload!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
