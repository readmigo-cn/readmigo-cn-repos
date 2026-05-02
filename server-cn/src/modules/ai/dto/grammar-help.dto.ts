import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * 语法解释请求 DTO（grammar-help）。
 *
 * 与 ExplainWordRequestDto 类似，但输入是整句而非单词。
 * focus 字段允许调用方告诉 LLM 重点讲哪个语法点（如 "tense" / "subordinate clause"），
 * 服务端不做枚举校验，仅做长度限制——给前端 UI 留扩展空间。
 */
export class GrammarHelpDto {
  @ApiProperty({ description: '需要解释语法的整句' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  sentence!: string;

  @ApiPropertyOptional({
    description: '关注点，例如 "tense" / "subordinate clause" / "phrasal verb"',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  focus?: string;

  @ApiPropertyOptional({ enum: ['zh-CN', 'zh-TW', 'en'], default: 'zh-CN' })
  @IsOptional()
  @IsIn(['zh-CN', 'zh-TW', 'en'])
  locale?: 'zh-CN' | 'zh-TW' | 'en';

  @ApiPropertyOptional({ description: 'CEFR 等级 A1-C2', default: 'B1' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  cefrLevel?: string;

  @ApiPropertyOptional({ description: '关联书籍 ID（可选，用于记录对话）' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  bookId?: string;
}
