import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('config')
@Controller('config')
export class ConfigController {
  @Get('bootstrap')
  getBootstrapConfig() {
    return {
      region: 'cn',
      runtime: 'harmony-next',
      authProvider: 'huawei-account',
      analyticsProvider: 'hms-analytics',
      iapProvider: 'hms-iap',
      llmPrimaryProvider: 'deepseek',
    };
  }
}
