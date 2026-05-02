import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

import type { AiConversationKind } from './ai-conversation.entity.js';

export type QuotaPeriod = 'daily' | 'monthly';

@Entity('ai_quotas')
@Index(['userId', 'period', 'kind'], { unique: true })
export class AiQuotaEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('uuid')
  userId!: string;

  @Column({ length: 8 })
  period!: QuotaPeriod;

  @Column({ length: 32 })
  kind!: AiConversationKind;

  @Column({ default: 0 })
  count!: number;

  @Column({ default: 50 })
  limit!: number;

  @Column({ type: 'timestamptz' })
  resetAt!: Date;
}
