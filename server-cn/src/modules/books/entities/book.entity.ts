import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type BookLanguage = 'en' | 'zh-CN' | 'zh-Hant';
export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type BookSourceType = 'gutenberg' | 'standard-ebooks' | 'publisher' | 'original';

@Entity('books')
export class BookEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ length: 128 })
  slug!: string;

  @Index()
  @Column({ length: 256 })
  title!: string;

  @Column({ length: 128, nullable: true })
  author!: string | null;

  @Column({ length: 8, default: 'en' })
  language!: BookLanguage;

  @Column({ length: 8, nullable: true })
  originalLanguage!: string | null;

  @Column({ length: 16, nullable: true })
  cefrLevel!: CefrLevel | null;

  @Column({ default: 0 })
  wordCount!: number;

  @Column({ default: 0 })
  pageCount!: number;

  @Column({ length: 512, nullable: true })
  coverUrl!: string | null;

  @Column({ length: 32, default: 'standard-ebooks' })
  sourceType!: BookSourceType;

  @Column({ length: 128, nullable: true })
  sourceId!: string | null;

  @Column({ length: 128, nullable: true })
  license!: string | null;

  @Column({ nullable: true })
  publishedYear!: number | null;

  @Column({ length: 32, nullable: true })
  isbn!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'simple-array', nullable: true })
  tags!: string[] | null;

  @Column({ length: 64, nullable: true })
  category!: string | null;

  @Column({ length: 128, nullable: true })
  series!: string | null;

  @Column({ nullable: true })
  seriesIndex!: number | null;

  @Column({ default: false })
  isAuditPassed!: boolean;

  @Column({ default: false })
  isPublished!: boolean;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  popularity!: number;

  @Column({ type: 'numeric', precision: 3, scale: 2, default: 0 })
  avgRating!: number;

  @Column({ default: 0 })
  ratingsCount!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt!: Date | null;
}
