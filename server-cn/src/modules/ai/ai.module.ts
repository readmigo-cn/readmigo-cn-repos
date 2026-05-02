import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AiConversationEntity } from './entities/ai-conversation.entity.js';
import { AiMessageEntity } from './entities/ai-message.entity.js';
import { AiCacheEntity } from './entities/ai-cache.entity.js';
import { AiQuotaEntity } from './entities/ai-quota.entity.js';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AiConversationEntity,
      AiMessageEntity,
      AiCacheEntity,
      AiQuotaEntity,
    ]),
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
