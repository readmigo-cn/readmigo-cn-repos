import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * 短信验证码记录表。
 * 明文 code 仅传给用户手机，数据库只存 SHA-256 哈希。
 * 每次发送创建新行；验证成功后写入 usedAt。
 *
 * TODO W4: 限流（5次/小时/手机号）使用 Redis sliding window，
 *           当前使用数据库 attempts 字段粗略控制，生产前替换。
 */
@Entity('sms_codes')
export class SmsCodeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** 接收验证码的手机号 */
  @Index()
  @Column({ length: 32 })
  phone!: string;

  /** SHA-256(code)，不存明文 */
  @Column({ length: 64 })
  codeHash!: string;

  /** 错误尝试次数，超过 5 次锁定本条记录 */
  @Column({ default: 0 })
  attempts!: number;

  /** 验证码过期时间（创建时 +5 分钟） */
  @Column('timestamptz')
  expiresAt!: Date;

  /** 成功使用时间戳；非 null 表示已核销 */
  @Column({ type: 'timestamptz', nullable: true, default: null })
  usedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
