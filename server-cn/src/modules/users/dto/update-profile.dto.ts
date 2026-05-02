import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUrl, Length } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: '米果读者', description: '显示昵称' })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  displayName?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg', description: '头像 URL' })
  @IsOptional()
  @IsUrl({}, { message: 'invalid_avatar_url' })
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 'zh-CN', description: '首选语言' })
  @IsOptional()
  @IsString()
  @Length(2, 10)
  locale?: string;

  @ApiPropertyOptional({ example: 'B1', enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] })
  @IsOptional()
  @IsIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'], { message: 'invalid_english_level' })
  englishLevel?: string;
}
