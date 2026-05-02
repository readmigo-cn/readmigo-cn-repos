import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class OAuthCallbackDto {
  @ApiProperty({ description: '授权码 authCode / code', example: 'AT0001xxxxxx' })
  @IsString()
  code!: string;

  @ApiPropertyOptional({ description: '设备 ID', example: 'device-uuid-v4' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({ description: '设备名称', example: 'Mate 60 Pro' })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional({ enum: ['huawei', 'wechat', 'qq'] })
  @IsOptional()
  @IsIn(['huawei', 'wechat', 'qq'])
  provider?: string;
}
