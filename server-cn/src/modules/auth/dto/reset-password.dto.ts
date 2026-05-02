import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: '13800001234' })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: 'invalid_phone' })
  phone!: string;

  @ApiProperty({ example: '123456', description: '短信验证码' })
  @IsString()
  @Length(4, 6)
  code!: string;

  @ApiProperty({ example: 'NewPassword123!', description: '新密码，最少 8 位' })
  @IsString()
  @MinLength(8, { message: 'password_too_short' })
  newPassword!: string;
}
