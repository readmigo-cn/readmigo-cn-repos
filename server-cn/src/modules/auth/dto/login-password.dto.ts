import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LoginPasswordDto {
  @ApiProperty({ example: '13800001234 或 user@example.com', description: '手机号或邮箱' })
  @IsString()
  identity!: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(8, { message: 'password_too_short' })
  password!: string;
}
