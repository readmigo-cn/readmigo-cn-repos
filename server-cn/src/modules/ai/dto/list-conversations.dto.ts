import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

import type { AiConversationKind } from '../entities/ai-conversation.entity.js';

export class ListConversationsDto {
  @ApiPropertyOptional({ enum: ['word-explain', 'sentence-translate', 'content-qa', 'grammar-help'] })
  @IsOptional()
  @IsIn(['word-explain', 'sentence-translate', 'content-qa', 'grammar-help'])
  kind?: AiConversationKind;
}
