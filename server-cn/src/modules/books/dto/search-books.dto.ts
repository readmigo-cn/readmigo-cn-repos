import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SearchBooksDto {
  @ApiProperty({ description: 'Search keyword (min 2 chars)' })
  @IsString()
  @MinLength(2)
  @MaxLength(128)
  q!: string;

  @ApiPropertyOptional({ enum: ['en', 'zh-CN', 'zh-Hant'] })
  @IsOptional()
  @IsIn(['en', 'zh-CN', 'zh-Hant'])
  language?: string;

  @ApiPropertyOptional({ enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] })
  @IsOptional()
  @IsIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])
  cefrLevel?: string;
}
