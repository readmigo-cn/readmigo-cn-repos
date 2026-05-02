import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPassword123!', description: '当前密码' })
  @IsString()
  @MinLength(8, { message: 'password_too_short' })
  oldPassword!: string;

  @ApiProperty({ example: 'NewPassword456!', description: '新密码，最少 8 位' })
  @IsString()
  @MinLength(8, { message: 'password_too_short' })
  newPassword!: string;
}
