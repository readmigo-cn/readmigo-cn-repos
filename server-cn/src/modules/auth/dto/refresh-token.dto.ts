import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: '登录时返回的 refreshToken' })
  @IsString()
  refreshToken!: string;

  @ApiProperty({ description: '设备 ID，与登录时保持一致', example: 'device-uuid-v4' })
  @IsString()
  deviceId!: string;
}
