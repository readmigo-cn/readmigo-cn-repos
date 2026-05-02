import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type AiMessageRole = 'user' | 'assistant';
export type AiProvider = 'deepseek' | 'qwen' | 'wenxin' | 'zhipu';

@Entity('ai_messages')
@Index(['conversationId'])
export class AiMessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('uuid')
  conversationId!: string;

  @Column({ length: 16 })
  role!: AiMessageRole;

  @Column({ type: 'text' })
  content!: string;

  @Column({ length: 16, nullable: true })
  provider!: AiProvider | null;

  @Column({ length: 64, nullable: true })
  model!: string | null;

  @Column({ default: 0 })
  totalTokens!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
