import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type HighlightColor = 'yellow' | 'blue' | 'pink' | 'green';

@Entity('reading_highlights')
export class ReadingHighlightEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('uuid')
  userId!: string;

  @Index()
  @Column({ length: 64 })
  bookId!: string;

  @Column()
  chapterIndex!: number;

  @Column({ default: 0 })
  paragraphIndex!: number;

  @Column({ default: 0 })
  startOffset!: number;

  @Column({ default: 0 })
  endOffset!: number;

  @Column({ type: 'text' })
  text!: string;

  @Column({ length: 8, default: 'yellow' })
  color!: HighlightColor;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
