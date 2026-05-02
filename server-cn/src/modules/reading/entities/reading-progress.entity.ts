import { Column, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('reading_progress')
@Index(['userId', 'bookId'], { unique: true })
export class ReadingProgressEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @Column({ length: 64 })
  bookId!: string;

  @Column({ default: 0 })
  currentChapterIndex!: number;

  @Column({ default: 0 })
  currentParagraphIndex!: number;

  @Column({ default: 0 })
  scrollOffset!: number;

  @Column({ type: 'real', default: 0 })
  percentComplete!: number;

  @Column({ nullable: true })
  lastReadAt!: Date | null;

  @Column({ default: 0 })
  totalReadMinutes!: number;

  @Column({ default: 0 })
  sessionsCount!: number;

  @UpdateDateColumn()
  updatedAt!: Date;
}
