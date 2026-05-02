import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** 已支持的 OAuth 提供商 */
export type OAuthProvider = 'huawei' | 'wechat' | 'qq';

/**
 * OAuth 绑定表：一个用户可绑定多个第三方账号。
 * providerUserId 在对应 provider 内唯一。
 */
@Entity('oauth_bindings')
@Index('uq_oauth_provider_uid', ['provider', 'providerUserId'], { unique: true })
export class OAuthBindingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** 本地用户 */
  @Index()
  @Column('uuid')
  userId!: string;

  /** OAuth 提供商名称 */
  @Column({ length: 16 })
  provider!: OAuthProvider;

  /** 提供商侧的用户唯一 ID（openId / unionId） */
  @Column({ length: 128 })
  providerUserId!: string;

  /** 提供商返回的额外用户信息（头像、昵称等），JSONB */
  @Column({ type: 'jsonb', nullable: true, default: null })
  providerData!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;
}
