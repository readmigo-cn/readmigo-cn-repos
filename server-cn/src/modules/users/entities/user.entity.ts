import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ length: 32, nullable: true })
  phone!: string | null;

  @Index({ unique: true })
  @Column({ length: 64, nullable: true })
  huaweiOpenId!: string | null;

  @Column({ length: 64 })
  nickname!: string;

  @Column({ length: 512, nullable: true })
  avatarUrl!: string | null;

  @Column({ length: 16, default: 'B1' })
  cefrLevel!: string;

  @Column({ length: 16, default: 'zh-CN' })
  locale!: string;

  @Column({ default: false })
  isInternal!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
