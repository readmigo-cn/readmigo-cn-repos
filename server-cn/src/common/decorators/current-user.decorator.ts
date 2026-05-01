import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';

export interface CurrentUserPayload {
  id: string;
  phone?: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload | undefined => {
    const req = ctx.switchToHttp().getRequest<Request & { user?: CurrentUserPayload }>();
    return req.user;
  },
);
