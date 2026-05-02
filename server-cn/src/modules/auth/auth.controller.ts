import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';
import { AuthService } from './auth.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { LoginPasswordDto } from './dto/login-password.dto.js';
import { OAuthCallbackDto } from './dto/oauth-callback.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { SmsLoginDto } from './dto/sms-login.dto.js';
import { SmsSendDto } from './dto/sms-send.dto.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // ─── 短信验证码 ─────────────────────────────────────────────

  @Post('sms/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '发送短信验证码' })
  @ApiResponse({ status: 200, description: '发送成功' })
  @ApiResponse({ status: 400, description: '手机号格式错误' })
  sendSms(@Body() dto: SmsSendDto) {
    return this.auth.sendSmsCode(dto.phone);
  }

  @Post('sms/login')
  @ApiOperation({ summary: '短信验证码登录 / 注册' })
  @ApiResponse({ status: 201, description: '登录成功，返回 token 对' })
  @ApiResponse({ status: 400, description: 'invalid_code' })
  loginByCode(@Body() dto: SmsLoginDto) {
    return this.auth.loginByCode(dto.phone, dto.code);
  }

  // ─── 密码注册与登录 ─────────────────────────────────────────

  @Post('register')
  @ApiOperation({ summary: '邮箱 / 手机号 + 密码注册' })
  @ApiResponse({ status: 201, description: '注册成功，返回 token 对' })
  @ApiResponse({ status: 400, description: 'phone_or_email_required | phone_already_registered | email_already_registered' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '密码登录（邮箱或手机号）' })
  @ApiResponse({ status: 200, description: '登录成功，返回 token 对' })
  @ApiResponse({ status: 401, description: 'invalid_credentials | account_disabled | no_password_set' })
  loginByPassword(@Body() dto: LoginPasswordDto) {
    return this.auth.loginByPassword(dto);
  }

  // ─── Token 管理 ─────────────────────────────────────────────

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '刷新 access token（Refresh token 轮转）' })
  @ApiResponse({ status: 200, description: '返回新 token 对' })
  @ApiResponse({ status: 401, description: 'invalid_refresh_token | session_not_found | refresh_token_mismatch' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refresh(dto.refreshToken, dto.deviceId);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '登出（删除当前或全部 session）' })
  @ApiResponse({ status: 200, description: '登出成功' })
  @ApiResponse({ status: 401, description: '未登录' })
  async logout(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { sessionId?: string },
  ) {
    await this.auth.logout(user.id, body.sessionId);
    return { ok: true };
  }

  // ─── OAuth 登录 ─────────────────────────────────────────────

  @Post('huawei-login')
  @ApiOperation({ summary: '华为账号登录（Mock，Phase 4 接真实 SDK）' })
  @ApiResponse({ status: 201, description: '登录成功，返回 token 对' })
  @ApiResponse({ status: 401, description: 'user_inactive' })
  huaweiLogin(@Body() dto: OAuthCallbackDto) {
    return this.auth.huaweiLogin(dto);
  }

  @Post('wechat-login')
  @ApiOperation({ summary: '微信登录（Mock，Phase 4 接真实 SDK）' })
  @ApiResponse({ status: 201, description: '登录成功，返回 token 对' })
  @ApiResponse({ status: 401, description: 'user_inactive' })
  wechatLogin(@Body() dto: OAuthCallbackDto) {
    return this.auth.wechatLogin(dto);
  }

  // ─── 密码管理 ───────────────────────────────────────────────

  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '忘记密码 - 通过短信验证码重置' })
  @ApiResponse({ status: 200, description: '重置成功' })
  @ApiResponse({ status: 400, description: 'invalid_code' })
  @ApiResponse({ status: 404, description: 'user_not_found' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.phone, dto.code, dto.newPassword);
  }

  @Post('password/change')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '修改密码（已登录，需旧密码验证）' })
  @ApiResponse({ status: 200, description: '修改成功' })
  @ApiResponse({ status: 400, description: 'incorrect_old_password | no_password_set' })
  @ApiResponse({ status: 401, description: '未登录' })
  changePassword(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.auth.changePassword(user.id, dto.oldPassword, dto.newPassword);
  }
}
