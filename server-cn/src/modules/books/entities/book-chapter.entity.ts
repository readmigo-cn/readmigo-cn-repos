import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('book_chapters')
@Index(['bookId', 'chapterIndex'], { unique: true })
export class BookChapterEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ length: 64 })
  bookId!: string;

  @Column()
  chapterIndex!: number;

  @Column({ length: 256, nullable: true })
  title!: string | null;

  @Column({ type: 'text' })
  contentHtml!: string;

  @Column({ default: 0 })
  wordCount!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
