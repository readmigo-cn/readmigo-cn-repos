import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateVocabNoteDto {
  @ApiProperty({ example: 'ephemeral' })
  @IsString()
  @MaxLength(128)
  word!: string;

  @ApiPropertyOptional({ example: 'ephemeral' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  lemma?: string;

  @ApiPropertyOptional({ example: '/ɪˈfem.ər.əl/' })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  pronunciation?: string;

  @ApiPropertyOptional({ example: 'Lasting for a very short time.' })
  @IsOptional()
  @IsString()
  definition?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  exampleSentence?: string;

  @ApiPropertyOptional({ example: 'pg-frankenstein' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  sourceBookId?: string;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sourceChapterIndex?: number;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sourceParagraphIndex?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceContext?: string;

  @ApiPropertyOptional({ example: 'literature' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  userTag?: string;

  @ApiPropertyOptional({ isArray: true, type: String, example: ['adjective', 'formal'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  aiTags?: string[];

  @ApiPropertyOptional({ example: 'adjective' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  partOfSpeech?: string;

  @ApiPropertyOptional({ example: 3, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  difficulty?: number;
}
