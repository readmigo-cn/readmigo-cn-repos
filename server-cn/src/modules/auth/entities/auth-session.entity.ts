import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * 登录会话表：每台设备持有一条记录。
 * refreshToken 以 SHA-256 哈希形式存储，原始 token 仅在颁发时返回一次。
 * 登出或刷新时删除/更新本行，实现 per-device 撤销。
 */
@Entity('auth_sessions')
export class AuthSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** 所属用户 */
  @Index()
  @Column('uuid')
  userId!: string;

  /** 设备唯一标识（客户端生成 UUID） */
  @Column({ length: 128 })
  deviceId!: string;

  /** 设备名称，可选，用于「已登录设备」管理页 */
  @Column({ length: 128, nullable: true, default: null })
  deviceName!: string | null;

  /** SHA-256(refreshToken)，不存明文 */
  @Column({ length: 64, select: false })
  refreshTokenHash!: string;

  /** refresh token 过期时间 */
  @Column('timestamptz')
  expiresAt!: Date;

  /** 最近活跃时间，每次刷新更新 */
  @Column({ type: 'timestamptz', nullable: true, default: null })
  lastActiveAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
