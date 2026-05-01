import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type SubscriptionPlan = 'pro_monthly' | 'pro_yearly' | 'premium_monthly';
export type SubscriptionStatus = 'pending' | 'active' | 'cancelled' | 'expired' | 'failed';

@Entity('subscriptions')
export class SubscriptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('uuid')
  userId!: string;

  @Column({ length: 32 })
  plan!: SubscriptionPlan;

  @Index()
  @Column({ length: 16, default: 'pending' })
  status!: SubscriptionStatus;

  @Column({ length: 16, default: 'hms-iap' })
  provider!: string;

  @Column({ length: 512, nullable: true })
  purchaseToken!: string | null;

  @Column({ length: 64, nullable: true })
  productId!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;

  @Column({ default: true })
  autoRenew!: boolean;

  @Column({ type: 'text', nullable: true })
  rawReceipt!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
