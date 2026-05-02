import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * PersonalNote — 读书笔记
 * 用户在阅读时写下的自由文本笔记，可关联到书籍的具体章节。
 */
@Entity('personal_notes')
@Index(['userId', 'createdAt'])
@Index(['userId', 'bookId'])
export class PersonalNoteEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  /** 关联书籍（可选，允许与书无关的随想笔记） */
  @Column({ length: 64, nullable: true })
  bookId!: string | null;

  @Column({ nullable: true })
  chapterIndex!: number | null;

  @Column({ type: 'text' })
  content!: string;

  /** 用户自定义标签，支持多个 */
  @Column({ type: 'simple-array', nullable: true })
  tags!: string[] | null;

  /** 预留给未来的笔记分享功能 */
  @Column({ default: false })
  isPublic!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
