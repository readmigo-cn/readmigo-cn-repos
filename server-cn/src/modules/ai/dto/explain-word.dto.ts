import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

import { ExplainWordDto as BaseExplainWordDto } from './explain.dto.js';

export class ExplainWordRequestDto extends BaseExplainWordDto {
  @ApiPropertyOptional({ description: '关联书籍 ID（可选，用于记录对话）' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  bookId?: string;
}
