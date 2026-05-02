import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

import type { AiConversationKind } from './ai-conversation.entity.js';

@Entity('ai_cache')
export class AiCacheEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ length: 64 })
  cacheKey!: string;

  @Column({ length: 32 })
  kind!: AiConversationKind;

  @Column({ type: 'text' })
  response!: string;

  @Column({ length: 16, nullable: true })
  provider!: string | null;

  @Column({ default: 1 })
  hitCount!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
