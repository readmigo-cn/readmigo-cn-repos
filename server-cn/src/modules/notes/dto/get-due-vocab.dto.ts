import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class GetDueVocabDto {
  @ApiPropertyOptional({ example: 20, default: 20, maximum: 100, description: '本次复习的最大题目数' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  count?: number = 20;

  @ApiPropertyOptional({ example: 'pg-frankenstein', description: '仅返回指定书籍的生词' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  sourceBookId?: string;

  @ApiPropertyOptional({ example: 'literature', description: '仅返回指定标签的生词' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  userTag?: string;
}
