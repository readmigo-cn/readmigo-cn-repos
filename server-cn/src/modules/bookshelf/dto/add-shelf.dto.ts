import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class AddShelfDto {
  @IsString()
  @MaxLength(64)
  bookId!: string;
}

export class UpdateShelfDto {
  @IsIn(['want', 'reading', 'finished'])
  @IsOptional()
  status?: 'want' | 'reading' | 'finished';
}
