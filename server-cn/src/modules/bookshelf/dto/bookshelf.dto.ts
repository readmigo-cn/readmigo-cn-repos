import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class AddToBookshelfDto {
  @ApiProperty({ description: 'Book UUID or legacy string ID' })
  @IsString()
  @MaxLength(64)
  bookId!: string;
}

export class UpdateShelfStatusDto {
  @ApiProperty({ enum: ['want-to-read', 'reading', 'finished'] })
  @IsIn(['want-to-read', 'reading', 'finished'])
  status!: 'want-to-read' | 'reading' | 'finished';
}

export class ListBookshelfDto {
  @ApiPropertyOptional({ enum: ['want-to-read', 'reading', 'finished'] })
  @IsOptional()
  @IsIn(['want-to-read', 'reading', 'finished'])
  status?: 'want-to-read' | 'reading' | 'finished';

  @ApiPropertyOptional({ description: 'Filter favorites only' })
  @IsOptional()
  @IsBoolean()
  favorites?: boolean;
}
