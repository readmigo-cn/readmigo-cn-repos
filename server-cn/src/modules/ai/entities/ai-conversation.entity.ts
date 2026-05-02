import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type AiConversationKind = 'word-explain' | 'sentence-translate' | 'content-qa' | 'grammar-help';

@Entity('ai_conversations')
@Index(['userId', 'kind'])
export class AiConversationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('uuid')
  userId!: string;

  @Column({ length: 32 })
  kind!: AiConversationKind;

  @Column({ length: 64, nullable: true })
  bookId!: string | null;

  @Column({ nullable: true })
  chapterIndex!: number | null;

  @Column({ length: 256 })
  title!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
