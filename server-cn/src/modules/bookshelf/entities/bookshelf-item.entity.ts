import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type ShelfStatus = 'want' | 'reading' | 'finished';

@Entity('bookshelf_items')
@Index(['userId', 'bookId'], { unique: true })
export class BookshelfItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @Column({ length: 64 })
  bookId!: string;

  @Column({ length: 16, default: 'reading' })
  status!: ShelfStatus;

  @CreateDateColumn()
  addedAt!: Date;
}
