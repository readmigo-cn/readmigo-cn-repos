import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

import { SyncEntityType } from '../entities/sync-cursor.entity.js';

const ENTITY_TYPES: SyncEntityType[] = [
  'vocab-note',
  'personal-note',
  'reading-progress',
  'reading-highlight',
  'bookshelf-item',
];

export class PullChangesDto {
  @ApiProperty({ enum: ENTITY_TYPES, example: 'vocab-note' })
  @IsIn(ENTITY_TYPES)
  entityType!: SyncEntityType;

  /**
   * 上次同步时间（ISO 8601），返回此时间之后更新的记录。
   * 首次同步可省略，服务端将返回全量数据。
   */
  @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  since?: string;

  /** 设备 ID，用于更新 cursor */
  @ApiProperty({ example: 'device-uuid-xxxx' })
  @IsString()
  @MaxLength(128)
  deviceId!: string;
}
