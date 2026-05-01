import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ExplainWordDto {
  @ApiProperty({ description: '需要解释的单词或短语' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  word!: string;

  @ApiProperty({ description: '上下文句子（含目标词）' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  context!: string;

  @ApiPropertyOptional({ enum: ['zh-CN', 'zh-TW', 'en'], default: 'zh-CN' })
  @IsOptional()
  @IsIn(['zh-CN', 'zh-TW', 'en'])
  locale?: 'zh-CN' | 'zh-TW' | 'en';

  @ApiPropertyOptional({ description: 'CEFR 等级 A1-C2', default: 'B1' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  cefrLevel?: string;
}
