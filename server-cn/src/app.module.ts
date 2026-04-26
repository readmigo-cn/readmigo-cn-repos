import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AiModule } from './modules/ai/ai.module.js';
import { HealthModule } from './modules/health/health.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    HealthModule,
    AiModule,
  ],
})
export class AppModule {}
