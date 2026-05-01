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

  @Column({ length: 128, nullable: true })
  chapterId!: string | null;

  @Column({ default: 0 })
  position!: number;

  @Column({ type: 'real', default: 0 })
  percent!: number;

  @UpdateDateColumn()
  updatedAt!: Date;
}
