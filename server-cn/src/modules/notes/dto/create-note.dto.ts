import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateNoteDto {
  @IsString()
  @MaxLength(64)
  bookId!: string;

  @IsString()
  @IsOptional()
  @MaxLength(128)
  chapterId?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  blockIndex?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  charOffset?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  charLength?: number;

  @IsString()
  @MaxLength(2000)
  originalText!: string;

  @IsString()
  @IsOptional()
  noteText?: string;

  @IsIn(['highlight', 'note', 'word'])
  @IsOptional()
  kind?: 'highlight' | 'note' | 'word';

  @IsString()
  @IsOptional()
  @MaxLength(16)
  color?: string;
}
