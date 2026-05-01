import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('books')
export class BookEntity {
  @PrimaryColumn({ length: 64 })
  id!: string;

  @Index()
  @Column({ length: 256 })
  title!: string;

  @Column({ length: 128, nullable: true })
  author!: string | null;

  @Column({ length: 512, nullable: true })
  coverUrl!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ length: 8, default: 'en' })
  language!: string;

  @Column({ length: 16, nullable: true })
  cefrLevel!: string | null;

  @Column({ default: 0 })
  totalChapters!: number;

  @Column({ length: 32, default: 'standard-ebooks' })
  source!: string;

  @Column({ default: false })
  isPublished!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
