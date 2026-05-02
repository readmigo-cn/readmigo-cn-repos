import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateProgressDto {
  @ApiProperty({ description: 'Zero-based chapter index' })
  @IsInt()
  @Min(0)
  currentChapterIndex!: number;

  @ApiPropertyOptional({ description: 'Zero-based paragraph index within the chapter' })
  @IsOptional()
  @IsInt()
  @Min(0)
  currentParagraphIndex?: number;

  @ApiPropertyOptional({ description: 'Vertical scroll offset in pixels' })
  @IsOptional()
  @IsInt()
  @Min(0)
  scrollOffset?: number;

  @ApiProperty({ description: 'Reading completion percentage (0–1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  percentComplete!: number;
}
