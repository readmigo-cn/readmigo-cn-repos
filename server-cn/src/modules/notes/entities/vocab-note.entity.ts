import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * VocabNote — 生词本条目
 * 存储用户在阅读中查询/保存的单词，并持有 SM-2 复习调度参数。
 */
@Entity('vocab_notes')
@Index(['userId', 'word'])
@Index(['userId', 'nextReviewAt'])
@Index(['userId', 'sourceBookId'])
export class VocabNoteEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  /** 原始词形（大小写保留） */
  @Column({ length: 128 })
  word!: string;

  /** 词元（词典原形），用于去重与搜索 */
  @Column({ length: 128, nullable: true })
  lemma!: string | null;

  @Column({ length: 256, nullable: true })
  pronunciation!: string | null;

  /** AI 生成或用户编辑的释义 */
  @Column({ type: 'text', nullable: true })
  definition!: string | null;

  @Column({ type: 'text', nullable: true })
  exampleSentence!: string | null;

  /** 来源书籍 ID（可选） */
  @Column({ length: 64, nullable: true })
  sourceBookId!: string | null;

  @Column({ nullable: true })
  sourceChapterIndex!: number | null;

  @Column({ nullable: true })
  sourceParagraphIndex!: number | null;

  /** 单词所在的原文句子，用于上下文记忆 */
  @Column({ type: 'text', nullable: true })
  sourceContext!: string | null;

  /** 用户自定义标签 */
  @Column({ length: 64, nullable: true })
  userTag!: string | null;

  /** AI 提取的语义标签数组，如 ['verb', 'formal', 'literary'] */
  @Column({ type: 'simple-array', nullable: true })
  aiTags!: string[] | null;

  @Column({ length: 32, nullable: true })
  partOfSpeech!: string | null;

  /** 难度评级 1-5，由客户端或 AI 设置 */
  @Column({ default: 3 })
  difficulty!: number;

  // ── SM-2 复习调度字段 ────────────────────────────────────────────────────

  /** 下次应复习的时间（null 表示从未排入计划） */
  @Column({ type: 'timestamptz', nullable: true })
  nextReviewAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastReviewedAt!: Date | null;

  /** 总复习次数（质量 >= 3 的次数，用于区分"第一次"/"第二次"区间） */
  @Column({ default: 0 })
  reviewCount!: number;

  /**
   * EasinessFactor（简易因子）— SM-2 核心参数，默认 2.5。
   * 范围 [1.3, ∞)，越小说明单词越难记。
   */
  @Column({ type: 'real', default: 2.5 })
  easinessFactor!: number;

  /**
   * 当前复习间隔（天数），下次复习日期 = lastReviewedAt + interval days。
   * 0 = 尚未开始 SM-2 循环。
   */
  @Column({ default: 0 })
  interval!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
