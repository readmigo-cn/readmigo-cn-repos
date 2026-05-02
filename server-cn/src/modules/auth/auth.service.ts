import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import jwt from 'jsonwebtoken';
import { Repository } from 'typeorm';

import { UserEntity } from '../users/entities/user.entity.js';
import { LoginPasswordDto } from './dto/login-password.dto.js';
import { OAuthCallbackDto } from './dto/oauth-callback.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { AuthSessionEntity } from './entities/auth-session.entity.js';
import { OAuthBindingEntity } from './entities/oauth-binding.entity.js';
import { SmsCodeEntity } from './entities/sms-code.entity.js';

/** JWT 颁发后统一的返回结构 */
export interface TokenPair {
  token: string;
  refreshToken: string;
  userId: string;
}

/** Refresh token 有效期：30 天 */
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** 短信验证码有效期：5 分钟 */
const SMS_TTL_MS = 5 * 60 * 1000;
/** 单条 SMS 记录最多允许错误尝试次数 */
const SMS_MAX_ATTEMPTS = 5;
/** 同手机号在过去 1 小时内最多发送的短信验证码次数（DB-based fallback；W18 切 Redis 滑窗） */
const SMS_RATE_WINDOW_MS = 60 * 60 * 1000;
const SMS_RATE_MAX_PER_HOUR = 5;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(AuthSessionEntity)
    private readonly sessions: Repository<AuthSessionEntity>,
    @InjectRepository(OAuthBindingEntity)
    private readonly oauthBindings: Repository<OAuthBindingEntity>,
    @InjectRepository(SmsCodeEntity)
    private readonly smsCodes: Repository<SmsCodeEntity>,
    private readonly cfg: ConfigService,
  ) {}

  // ─── 短信验证码 ───────────────────────────────────────────────

  /**
   * 生成并持久化短信验证码。
   * 生产环境对接华为云 SMS（P2 TODO），当前仅写库并在非生产环境日志打印。
   */
  async sendSmsCode(phone: string): Promise<{ sent: boolean }> {
    // 限频：同手机号过去 1 小时内最多 5 条（dev 环境跳过，方便联调）。
    // TODO: Redis sliding window in W18 —— 用 Redis ZSET 维护毫秒级时间戳，比 DB 计数精准。
    const isProduction = this.cfg.get<string>('NODE_ENV') === 'production';
    if (isProduction) {
      const since = new Date(Date.now() - SMS_RATE_WINDOW_MS);
      const recentCount = await this.smsCodes
        .createQueryBuilder('s')
        .where('s.phone = :phone', { phone })
        .andWhere('s.createdAt > :since', { since })
        .getCount();
      if (recentCount >= SMS_RATE_MAX_PER_HOUR) {
        throw new BadRequestException('rate_limited');
      }
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + SMS_TTL_MS);

    // 持久化 SHA-256 哈希，不存明文
    const smsCode = this.smsCodes.create({
      phone,
      codeHash: this._hashSmsCode(code),
      expiresAt,
    });
    await this.smsCodes.save(smsCode);

    if (this.cfg.get<string>('NODE_ENV') !== 'production') {
      this.logger.warn(`[dev only] sms code for ${phone} = ${code}`);
    }
    // TODO Phase 2: 接入华为云 SMS / 阿里云 SMS
    return { sent: true };
  }

  /**
   * 用短信验证码登录或注册。
   * dev 环境保留万能码 0000 便于调试。
   */
  async loginByCode(phone: string, code: string): Promise<TokenPair> {
    const isProduction = this.cfg.get<string>('NODE_ENV') === 'production';
    const isDevUniversal = !isProduction && code === '0000';

    if (!isDevUniversal) {
      // 查询最新一条未使用且未过期的记录（QueryBuilder 支持 IS NULL 过滤）
      const latestCode = await this.smsCodes
        .createQueryBuilder('s')
        .where('s.phone = :phone', { phone })
        .andWhere('s.usedAt IS NULL')
        .andWhere('s.expiresAt > NOW()')
        .andWhere('s.attempts < :max', { max: SMS_MAX_ATTEMPTS })
        .orderBy('s.createdAt', 'DESC')
        .getOne();

      if (!latestCode || latestCode.codeHash !== this._hashSmsCode(code)) {
        if (latestCode) {
          // 记录错误尝试次数
          await this.smsCodes.update(latestCode.id, { attempts: latestCode.attempts + 1 });
        }
        throw new BadRequestException('invalid_code');
      }

      // 标记为已使用
      await this.smsCodes.update(latestCode.id, { usedAt: new Date() });
    }

    // 查找或创建用户
    let user = await this.users.findOne({ where: { phone } });
    if (!user) {
      user = this.users.create({
        phone,
        displayName: `读者${phone.slice(-4)}`,
        englishLevel: 'B1',
        locale: 'zh-CN',
      } as Partial<UserEntity>);
      user = await this.users.save(user);
    }

    return this._generateTokens(user);
  }

  // ─── 密码注册与登录 ──────────────────────────────────────────

  /**
   * 邮箱/手机号密码注册。
   * 密码使用 bcrypt cost=12 哈希。
   */
  async register(dto: RegisterDto): Promise<TokenPair> {
    if (!dto.phone && !dto.email) {
      throw new BadRequestException('phone_or_email_required');
    }

    // 检查重复注册
    if (dto.phone) {
      const existing = await this.users.findOne({ where: { phone: dto.phone } });
      if (existing) throw new BadRequestException('phone_already_registered');
    }
    if (dto.email) {
      const existing = await this.users.findOne({ where: { email: dto.email } });
      if (existing) throw new BadRequestException('email_already_registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const user = this.users.create({
      phone: dto.phone ?? null,
      email: dto.email ?? null,
      hashedPassword,
      displayName: dto.displayName ?? null,
      locale: dto.locale ?? 'zh-CN',
      englishLevel: (dto.englishLevel as UserEntity['englishLevel']) ?? 'B1',
    });
    const saved = await this.users.save(user);

    this.logger.log(`新用户注册 userId=${saved.id}`);
    return this._generateTokens(saved);
  }

  /**
   * 邮箱或手机号 + 密码登录。
   * identity 字段自动识别是手机号还是邮箱。
   */
  async loginByPassword(dto: LoginPasswordDto): Promise<TokenPair> {
    const isPhone = /^1[3-9]\d{9}$/.test(dto.identity);
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.hashedPassword')
      .where(isPhone ? 'u.phone = :identity' : 'u.email = :identity', { identity: dto.identity })
      .getOne();

    if (!user) throw new UnauthorizedException('invalid_credentials');
    if (!user.isActive) throw new UnauthorizedException('account_disabled');
    if (!user.hashedPassword) throw new UnauthorizedException('no_password_set');

    const match = await bcrypt.compare(dto.password, user.hashedPassword);
    if (!match) throw new UnauthorizedException('invalid_credentials');

    return this._generateTokens(user);
  }

  // ─── Token 刷新与登出 ─────────────────────────────────────────

  /**
   * Refresh token 轮转：验证 JWT 签名 → 匹配 session → 删除旧 session → 颁发新 token 对。
   * 每次刷新都是一次性的（Rolling refresh），降低 token 泄漏风险。
   */
  async refresh(refreshToken: string, deviceId: string): Promise<TokenPair> {
    const refreshSecret = this.cfg.get<string>('JWT_REFRESH_SECRET') ?? 'dev-refresh-secret-change-me';

    let payload: { sub?: string };
    try {
      payload = jwt.verify(refreshToken, refreshSecret) as { sub?: string };
    } catch {
      throw new UnauthorizedException('invalid_refresh_token');
    }

    if (!payload.sub) throw new UnauthorizedException('invalid_refresh_token');

    // 按 userId + deviceId 找到 session，addSelect 取出 hash 字段
    const session = await this.sessions
      .createQueryBuilder('s')
      .addSelect('s.refreshTokenHash')
      .where('s.userId = :userId', { userId: payload.sub })
      .andWhere('s.deviceId = :deviceId', { deviceId })
      .andWhere('s.expiresAt > NOW()')
      .getOne();

    if (!session) throw new UnauthorizedException('session_not_found');

    // 对比哈希，防止 token 被盗后继续使用
    if (session.refreshTokenHash !== this._hashRefreshToken(refreshToken)) {
      throw new UnauthorizedException('refresh_token_mismatch');
    }

    const user = await this.users.findOne({ where: { id: payload.sub } });
    if (!user || !user.isActive) throw new UnauthorizedException('user_inactive');

    // 注意：不在此处显式 delete 旧 session（W5 review Critical 2 修复）。
    // _generateTokens 内部已用 deviceId 维度的 delete + insert 完成轮转，
    // 提前 delete 会导致 _generateTokens 失败时旧 session 已丢，后续 retry 进入 phantom 401。
    return this._generateTokens(user, session.deviceId, session.deviceName ?? undefined);
  }

  /**
   * 登出：删除指定 session 或该用户全部 session（全局登出）。
   */
  async logout(userId: string, sessionId?: string): Promise<void> {
    if (sessionId) {
      await this.sessions.delete({ id: sessionId, userId });
    } else {
      // 未传 sessionId：删除该用户所有 session（全局登出）
      await this.sessions.delete({ userId });
    }
  }

  // ─── OAuth 登录（Mock，Phase 4 接真实 SDK） ──────────────────

  /**
   * 华为账号登录（Mock 实现）。
   * Phase 4 替换：调用 HMS Account Kit 的 server-side token 校验接口换取 openId。
   * TODO Phase 4: 接入 HMS Account Kit /account/token/v3 接口
   */
  async huaweiLogin(dto: OAuthCallbackDto): Promise<TokenPair> {
    // Mock: 用 authCode 生成伪造的 openId，仅供联调
    const mockOpenId = `mock-huawei-${dto.code}`;
    return this._oauthFindOrCreate('huawei', mockOpenId, dto);
  }

  /**
   * 微信登录（Mock 实现）。
   * TODO Phase 4: 接入微信 OAuth2 /sns/oauth2/access_token 换取 openid + unionid
   */
  async wechatLogin(dto: OAuthCallbackDto): Promise<TokenPair> {
    const mockOpenId = `mock-wechat-${dto.code}`;
    return this._oauthFindOrCreate('wechat', mockOpenId, dto);
  }

  // ─── 密码重置与修改 ──────────────────────────────────────────

  /**
   * 通过短信验证码重置密码（忘记密码场景）。
   */
  async resetPassword(phone: string, code: string, newPassword: string): Promise<void> {
    // 验证短信码
    const isProduction = this.cfg.get<string>('NODE_ENV') === 'production';
    if (isProduction || code !== '0000') {
      const record = await this.smsCodes
        .createQueryBuilder('s')
        .where('s.phone = :phone', { phone })
        .andWhere('s.usedAt IS NULL')
        .andWhere('s.expiresAt > NOW()')
        .andWhere('s.attempts < :max', { max: SMS_MAX_ATTEMPTS })
        .orderBy('s.createdAt', 'DESC')
        .getOne();

      if (!record || record.codeHash !== this._hashSmsCode(code)) {
        if (record) {
          await this.smsCodes.update(record.id, { attempts: record.attempts + 1 });
        }
        throw new BadRequestException('invalid_code');
      }
      await this.smsCodes.update(record.id, { usedAt: new Date() });
    }

    const user = await this.users.findOne({ where: { phone } });
    if (!user) throw new NotFoundException('user_not_found');

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await this.users.update(user.id, { hashedPassword });

    // 重置密码后撤销所有 session，强制重新登录
    await this.sessions.delete({ userId: user.id });
    this.logger.log(`用户密码已重置 userId=${user.id}`);
  }

  /**
   * 修改密码（已登录场景，需提供旧密码）。
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.hashedPassword')
      .where('u.id = :id', { id: userId })
      .getOne();

    if (!user) throw new NotFoundException('user_not_found');
    if (!user.hashedPassword) throw new BadRequestException('no_password_set');

    const match = await bcrypt.compare(oldPassword, user.hashedPassword);
    if (!match) throw new BadRequestException('incorrect_old_password');

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await this.users.update(userId, { hashedPassword });

    // 修改密码后撤销其他所有 session（当前设备 session 保留由调用方处理）
    await this.sessions.delete({ userId });
    this.logger.log(`用户密码已修改 userId=${userId}`);
  }

  // ─── 私有辅助方法 ────────────────────────────────────────────

  /**
   * 颁发 access token + refresh token，并将 session 持久化到数据库。
   * access token 有效期 1h，refresh token 有效期 30d（可配置）。
   */
  private async _generateTokens(
    user: UserEntity,
    deviceId?: string,
    deviceName?: string,
  ): Promise<TokenPair> {
    const secret = this.cfg.get<string>('JWT_SECRET') ?? 'dev-secret-change-me';
    const refreshSecret = this.cfg.get<string>('JWT_REFRESH_SECRET') ?? 'dev-refresh-secret-change-me';

    const resolvedDeviceId = deviceId ?? 'default';

    const token = jwt.sign({ sub: user.id, phone: user.phone }, secret, { expiresIn: '1h' });
    const refreshToken = jwt.sign(
      { sub: user.id, type: 'refresh' },
      refreshSecret,
      { expiresIn: '30d' },
    );

    // 单设备单 session：delete + insert 在 transaction 内保证原子
    // （W5 review Critical 2 修复：避免 delete 成功 / insert 失败留下空状态）
    await this.sessions.manager.transaction(async (mgr) => {
      await mgr.delete(AuthSessionEntity, { userId: user.id, deviceId: resolvedDeviceId });
      const session = mgr.create(AuthSessionEntity, {
        userId: user.id,
        deviceId: resolvedDeviceId,
        deviceName: deviceName ?? null,
        refreshTokenHash: this._hashRefreshToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
        lastActiveAt: new Date(),
      });
      await mgr.save(session);
    });

    return { token, refreshToken, userId: user.id };
  }

  /**
   * OAuth 登录的公共逻辑：按 provider + providerUserId 找或创建用户及绑定记录。
   */
  private async _oauthFindOrCreate(
    provider: 'huawei' | 'wechat',
    providerUserId: string,
    dto: OAuthCallbackDto,
  ): Promise<TokenPair> {
    let binding = await this.oauthBindings.findOne({
      where: { provider, providerUserId },
    });

    let user: UserEntity;
    if (binding) {
      const found = await this.users.findOne({ where: { id: binding.userId } });
      if (!found || !found.isActive) throw new UnauthorizedException('user_inactive');
      user = found;
    } else {
      // 首次 OAuth 登录：创建新用户
      user = this.users.create({
        locale: 'zh-CN',
        englishLevel: 'B1',
        displayName: `${provider}用户`,
      } as Partial<UserEntity>);
      user = await this.users.save(user);

      binding = this.oauthBindings.create({
        userId: user.id,
        provider,
        providerUserId,
        providerData: { mockOpenId: providerUserId },
      });
      await this.oauthBindings.save(binding);
      this.logger.log(`OAuth 首次登录，创建用户 userId=${user.id} provider=${provider}`);
    }

    return this._generateTokens(user, dto.deviceId, dto.deviceName);
  }

  /** SHA-256 哈希短信验证码（用于数据库存储） */
  private _hashSmsCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  /** SHA-256 哈希 refresh token（用于数据库存储） */
  private _hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
