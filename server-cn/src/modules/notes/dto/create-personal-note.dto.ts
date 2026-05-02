import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreatePersonalNoteDto {
  @ApiPropertyOptional({ example: 'pg-frankenstein' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  bookId?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  chapterIndex?: number;

  @ApiProperty({ example: 'This chapter draws heavily on Prometheus mythology.' })
  @IsString()
  content!: string;

  @ApiPropertyOptional({ isArray: true, type: String, example: ['theme', 'mythology'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
