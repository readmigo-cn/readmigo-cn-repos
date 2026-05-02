import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type ShelfStatus = 'want-to-read' | 'reading' | 'finished';

@Entity('bookshelf_items')
@Index(['userId', 'bookId'], { unique: true })
export class BookshelfItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @Column({ length: 64 })
  bookId!: string;

  @Column({ length: 16, default: 'want-to-read' })
  status!: ShelfStatus;

  @CreateDateColumn()
  addedAt!: Date;

  @Column({ nullable: true })
  finishedAt!: Date | null;

  @Column({ nullable: true })
  lastReadAt!: Date | null;

  @Column({ default: false })
  isFavorite!: boolean;
}
