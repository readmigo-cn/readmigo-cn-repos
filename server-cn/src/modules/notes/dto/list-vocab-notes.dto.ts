import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ListVocabNotesDto {
  @ApiPropertyOptional({ example: 'pg-frankenstein', description: '按来源书籍过滤' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  sourceBookId?: string;

  @ApiPropertyOptional({ example: 'literature', description: '按用户标签过滤' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  userTag?: string;

  @ApiPropertyOptional({ example: true, description: '仅返回待复习（nextReviewAt <= now）' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  dueOnly?: boolean;

  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 50, minimum: 1, maximum: 200, default: 50 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}
