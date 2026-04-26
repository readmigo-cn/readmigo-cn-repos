import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  @Post('huawei-login')
  huaweiLogin(@Body() body: Record<string, unknown>) {
    return {
      status: 'todo',
      provider: 'huawei-account',
      received: body,
    };
  }
}
