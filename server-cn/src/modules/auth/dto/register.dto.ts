import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiPropertyOptional({ example: '13800001234', description: '手机号（二选一）' })
  @IsOptional()
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: 'invalid_phone' })
  phone?: string;

  @ApiPropertyOptional({ example: 'user@example.com', description: '邮箱（二选一）' })
  @IsOptional()
  @IsEmail({}, { message: 'invalid_email' })
  email?: string;

  @ApiProperty({ example: 'Password123!', description: '密码，最少 8 位' })
  @IsString()
  @MinLength(8, { message: 'password_too_short' })
  password!: string;

  @ApiPropertyOptional({ example: '米果读者', description: '昵称' })
  @IsOptional()
  @IsString()
  @Length(1, 32)
  displayName?: string;

  @ApiPropertyOptional({ example: 'zh-CN' })
  @IsOptional()
  @IsString()
  @Length(2, 10)
  locale?: string;

  @ApiPropertyOptional({ example: 'B1', enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] })
  @IsOptional()
  @IsIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'], { message: 'invalid_english_level' })
  englishLevel?: string;
}
