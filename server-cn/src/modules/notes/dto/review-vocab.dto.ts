import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Max, Min } from 'class-validator';

export class ReviewVocabDto {
  @ApiProperty({ example: 'a1b2c3d4-...', description: '生词条目 ID' })
  @IsUUID()
  vocabNoteId!: string;

  /**
   * SM-2 质量评分（0-5）
   * 0 = 完全遗忘，3 = 勉强记住，5 = 非常轻松
   */
  @ApiProperty({ example: 4, minimum: 0, maximum: 5, description: 'SM-2 质量评分 0-5' })
  @IsInt()
  @Min(0)
  @Max(5)
  quality!: number;
}
