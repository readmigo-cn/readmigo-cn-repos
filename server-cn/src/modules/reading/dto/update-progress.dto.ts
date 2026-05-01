import { IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateProgressDto {
  @IsString()
  @MaxLength(64)
  bookId!: string;

  @IsString()
  @IsOptional()
  @MaxLength(128)
  chapterId?: string;

  @IsInt()
  @Min(0)
  position!: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  percent!: number;
}
