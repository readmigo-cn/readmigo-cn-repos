import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import type { Request } from 'express';

import type { CurrentUserPayload } from '../decorators/current-user.decorator.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly cfg: ConfigService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request & { user?: CurrentUserPayload }>();
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      throw new UnauthorizedException('missing_token');
    }
    const token = auth.slice('Bearer '.length).trim();
    const secret = this.cfg.get<string>('JWT_SECRET') ?? 'dev-secret-change-me';

    try {
      const payload = jwt.verify(token, secret) as { sub?: string; phone?: string };
      if (!payload.sub) throw new UnauthorizedException('invalid_token');
      req.user = { id: payload.sub, phone: payload.phone };
      return true;
    } catch (_err) {
      throw new UnauthorizedException('invalid_token');
    }
  }
}
