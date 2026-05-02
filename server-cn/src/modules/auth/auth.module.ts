import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserEntity } from '../users/entities/user.entity.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthSessionEntity } from './entities/auth-session.entity.js';
import { OAuthBindingEntity } from './entities/oauth-binding.entity.js';
import { SmsCodeEntity } from './entities/sms-code.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      AuthSessionEntity,
      OAuthBindingEntity,
      SmsCodeEntity,
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  // 导出 AuthService 供其他模块复用（如 admin 模块），
  // 导出 TypeOrmModule 使外部模块可直接注入 UserEntity repository
  exports: [AuthService, TypeOrmModule],
})
export class AuthModule {}
