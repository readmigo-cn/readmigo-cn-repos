import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateHighlightDto {
  @ApiProperty()
  @IsString()
  @MaxLength(64)
  bookId!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  chapterIndex!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  paragraphIndex?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  startOffset?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  endOffset?: number;

  @ApiProperty({ description: 'Highlighted text excerpt' })
  @IsString()
  @MaxLength(2000)
  text!: string;

  @ApiPropertyOptional({ enum: ['yellow', 'blue', 'pink', 'green'], default: 'yellow' })
  @IsOptional()
  @IsIn(['yellow', 'blue', 'pink', 'green'])
  color?: 'yellow' | 'blue' | 'pink' | 'green';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class UpdateHighlightDto {
  @ApiPropertyOptional({ enum: ['yellow', 'blue', 'pink', 'green'] })
  @IsOptional()
  @IsIn(['yellow', 'blue', 'pink', 'green'])
  color?: 'yellow' | 'blue' | 'pink' | 'green';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class ListHighlightsDto {
  @ApiPropertyOptional({ description: 'Filter to a specific chapter index' })
  @IsOptional()
  @IsInt()
  @Min(0)
  chapterIndex?: number;
}
