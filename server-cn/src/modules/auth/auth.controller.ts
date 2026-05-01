import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AuthService } from './auth.service.js';
import { SmsLoginDto } from './dto/sms-login.dto.js';
import { SmsSendDto } from './dto/sms-send.dto.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('sms/send')
  @HttpCode(HttpStatus.OK)
  sendSms(@Body() dto: SmsSendDto) {
    return this.auth.sendSmsCode(dto.phone);
  }

  @Post('sms/login')
  loginByCode(@Body() dto: SmsLoginDto) {
    return this.auth.loginByCode(dto.phone, dto.code);
  }

  @Post('huawei-login')
  huaweiLogin(@Body() body: { authCode?: string }) {
    return {
      status: 'todo',
      provider: 'huawei-account',
      authCode: body?.authCode ?? null,
      hint: 'HMS Account Kit 接入待 Phase 4',
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout() {
    return { ok: true };
  }
}
