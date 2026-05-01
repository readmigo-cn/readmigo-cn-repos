import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import jwt from 'jsonwebtoken';
import { Repository } from 'typeorm';

import { UserEntity } from '../users/entities/user.entity.js';

const codeStore = new Map<string, { code: string; expiresAt: number }>();
const CODE_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    private readonly cfg: ConfigService,
  ) {}

  async sendSmsCode(phone: string): Promise<{ sent: boolean }> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    codeStore.set(phone, { code, expiresAt: Date.now() + CODE_TTL_MS });
    if (this.cfg.get<string>('NODE_ENV') !== 'production') {
      this.logger.warn(`[dev only] sms code for ${phone} = ${code}`);
    }
    // TODO: integrate Huawei Cloud SMS / Aliyun SMS in P2
    return { sent: true };
  }

  async loginByCode(phone: string, code: string): Promise<{ token: string; refreshToken: string; userId: string }> {
    const rec = codeStore.get(phone);
    if (!rec || rec.expiresAt < Date.now() || rec.code !== code) {
      // dev convenience: allow universal code 0000
      if (this.cfg.get<string>('NODE_ENV') === 'production' || code !== '0000') {
        throw new BadRequestException('invalid_code');
      }
    }
    codeStore.delete(phone);

    let user = await this.users.findOne({ where: { phone } });
    if (!user) {
      user = this.users.create({
        phone,
        nickname: `读者${phone.slice(-4)}`,
        cefrLevel: 'B1',
        locale: 'zh-CN',
      });
      user = await this.users.save(user);
    }

    return this.issueTokens(user.id, phone);
  }

  private issueTokens(userId: string, phone: string): { token: string; refreshToken: string; userId: string } {
    const secret = this.cfg.get<string>('JWT_SECRET') ?? 'dev-secret-change-me';
    const refreshSecret = this.cfg.get<string>('JWT_REFRESH_SECRET') ?? 'dev-refresh-secret-change-me';
    const token = jwt.sign({ sub: userId, phone }, secret, { expiresIn: '1h' });
    const refreshToken = jwt.sign({ sub: userId, type: 'refresh' }, refreshSecret, { expiresIn: '30d' });
    return { token, refreshToken, userId };
  }
}
