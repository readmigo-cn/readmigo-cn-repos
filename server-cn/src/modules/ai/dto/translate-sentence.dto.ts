import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class TranslateSentenceDto {
  @ApiProperty({ description: '待翻译句子' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  sentence!: string;

  @ApiProperty({ enum: ['en', 'zh', 'auto'], default: 'auto' })
  @IsIn(['en', 'zh', 'auto'])
  sourceLang!: 'en' | 'zh' | 'auto';

  @ApiProperty({ enum: ['en', 'zh'] })
  @IsIn(['en', 'zh'])
  targetLang!: 'en' | 'zh';

  @ApiPropertyOptional({ description: '关联书籍 ID' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  bookId?: string;
}
