import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type ReviewResponse = 'correct' | 'incorrect' | 'skipped';

/**
 * VocabReviewLog — 每次复习的历史快照
 * 记录 SM-2 参数在本次复习前后的变化，方便后续学习曲线分析。
 */
@Entity('vocab_review_logs')
@Index(['userId', 'reviewedAt'])
@Index(['vocabNoteId'])
export class VocabReviewLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @Column('uuid')
  vocabNoteId!: string;

  @Column({ type: 'timestamptz' })
  reviewedAt!: Date;

  /** SM-2 质量评分 0-5 */
  @Column()
  quality!: number;

  /** 本次复习前的 easinessFactor */
  @Column({ type: 'real' })
  priorEasiness!: number;

  /** 本次复习后的 easinessFactor */
  @Column({ type: 'real' })
  newEasiness!: number;

  /** 本次复习前的 interval（天） */
  @Column()
  priorInterval!: number;

  /** 本次复习后的 interval（天） */
  @Column()
  newInterval!: number;

  @Column({ length: 16, default: 'correct' })
  response!: ReviewResponse;
}
