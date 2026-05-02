import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class SyncStatusQueryDto {
  @ApiProperty({ example: 'device-uuid-xxxx', description: '设备 ID' })
  @IsString()
  @MaxLength(128)
  deviceId!: string;
}
