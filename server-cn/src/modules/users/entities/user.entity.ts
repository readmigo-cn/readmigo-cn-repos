import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** 用户角色枚举 */
export type UserRole = 'user' | 'admin' | 'internal';

/** CEFR 英语等级枚举 */
export type EnglishLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** 手机号（中国大陆格式），短信登录主键 */
  @Index({ unique: true })
  @Column({ length: 32, nullable: true, default: null })
  phone!: string | null;

  /** 邮箱，密码登录场景使用 */
  @Index({ unique: true })
  @Column({ length: 128, nullable: true, default: null })
  email!: string | null;

  /** bcrypt 哈希密码；OAuth 纯社交用户为 null */
  @Column({ length: 128, nullable: true, default: null, select: false })
  hashedPassword!: string | null;

  /** 密码盐（当前 bcrypt 自带盐，保留字段备用扩展） */
  @Column({ length: 64, nullable: true, default: null, select: false })
  passwordSalt!: string | null;

  /** 华为 OpenID（历史字段，迁移后由 OAuthBinding 接管） */
  @Index({ unique: true })
  @Column({ length: 64, nullable: true, default: null })
  huaweiOpenId!: string | null;

  /** 显示昵称 */
  @Column({ length: 64, nullable: true, default: null })
  displayName!: string | null;

  /** 头像 URL；W10 接入华为云 OBS */
  @Column({ length: 512, nullable: true, default: null })
  avatarUrl!: string | null;

  /** 角色：user / admin / internal */
  @Column({ length: 16, default: 'user' })
  role!: UserRole;

  /** 账号是否启用 */
  @Column({ default: true })
  isActive!: boolean;

  /** 内部测试用户标记，用于数据过滤（对齐 Readmigo global 模式） */
  @Column({ default: false })
  isInternal!: boolean;

  /** 首选语言 locale，如 zh-CN / en */
  @Column({ length: 16, default: 'zh-CN' })
  locale!: string;

  /** CEFR 英语等级 */
  @Column({ length: 4, default: 'B1' })
  englishLevel!: EnglishLevel;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  /** 软删除时间戳；非 null 表示已注销 */
  @DeleteDateColumn({ nullable: true, default: null })
  deletedAt!: Date | null;
}
