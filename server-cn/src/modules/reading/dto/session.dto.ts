import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class SessionStartDto {
  @ApiProperty({ description: 'Book UUID or string ID' })
  @IsString()
  @MaxLength(64)
  bookId!: string;
}

export class SessionEndDto {
  @ApiProperty({ description: 'Total session duration in seconds' })
  @IsInt()
  @Min(0)
  durationSeconds!: number;

  @ApiPropertyOptional({ description: 'Number of pages scrolled through' })
  @IsOptional()
  @IsInt()
  @Min(0)
  pagesRead?: number;

  @ApiPropertyOptional({ description: 'Number of chapter transitions' })
  @IsOptional()
  @IsInt()
  @Min(0)
  chaptersRead?: number;

  @ApiPropertyOptional({ description: 'Number of words looked up in dictionary' })
  @IsOptional()
  @IsInt()
  @Min(0)
  wordsLooked?: number;
}
