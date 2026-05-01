import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type NoteKind = 'highlight' | 'note' | 'word';

@Entity('notes')
@Index(['userId', 'bookId'])
@Index(['bookId', 'chapterId'])
export class NoteEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @Column({ length: 64 })
  bookId!: string;

  @Column({ length: 128, nullable: true })
  chapterId!: string | null;

  @Column({ default: 0 })
  blockIndex!: number;

  @Column({ default: 0 })
  charOffset!: number;

  @Column({ default: 0 })
  charLength!: number;

  @Column({ length: 2000 })
  originalText!: string;

  @Column({ type: 'text', nullable: true })
  noteText!: string | null;

  @Column({ length: 16, default: 'highlight' })
  kind!: NoteKind;

  @Column({ length: 16, nullable: true })
  color!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
