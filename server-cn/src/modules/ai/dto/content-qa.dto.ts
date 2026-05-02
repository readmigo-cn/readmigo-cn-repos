import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';

export class ContentQaDto {
  @ApiProperty({ description: '书籍 ID' })
  @IsString()
  @MaxLength(64)
  bookId!: string;

  @ApiProperty({ description: '章节索引（从 0 开始）' })
  @IsNumber()
  @Min(0)
  chapterIndex!: number;

  @ApiProperty({ description: '用户问题' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  question!: string;

  @ApiPropertyOptional({ description: '会话 ID（续聊时传入）' })
  @IsOptional()
  @IsUUID()
  conversationId?: string;
}
