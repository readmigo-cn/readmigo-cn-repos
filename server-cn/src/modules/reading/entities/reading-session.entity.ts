import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('reading_sessions')
export class ReadingSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('uuid')
  userId!: string;

  @Column({ length: 64 })
  bookId!: string;

  @CreateDateColumn()
  startedAt!: Date;

  @Column({ nullable: true })
  endedAt!: Date | null;

  @Column({ default: 0 })
  durationSeconds!: number;

  @Column({ default: 0 })
  pagesRead!: number;

  @Column({ default: 0 })
  chaptersRead!: number;

  @Column({ default: 0 })
  wordsLooked!: number;
}
