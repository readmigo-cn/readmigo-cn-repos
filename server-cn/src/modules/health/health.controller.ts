import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { HealthService } from './health.service.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getHealth() {
    return this.healthService.getStatus();
  }

  @Get('ready')
  async getReady() {
    return this.healthService.getReady();
  }

  @Get('metrics')
  getMetrics() {
    return this.healthService.getMetrics();
  }
}
