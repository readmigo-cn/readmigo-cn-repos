import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { SyncEntityType } from '../entities/sync-cursor.entity.js';

const ENTITY_TYPES: SyncEntityType[] = [
  'vocab-note',
  'personal-note',
  'reading-progress',
  'reading-highlight',
  'bookshelf-item',
];

export type SyncOp = 'create' | 'update' | 'delete';

export class SyncItemDto {
  @ApiProperty({ description: '客户端生成的本地 UUID（对应服务端记录的 id）' })
  @IsUUID()
  id!: string;

  @ApiProperty({ enum: ['create', 'update', 'delete'] })
  @IsIn(['create', 'update', 'delete'])
  op!: SyncOp;

  /** 客户端记录的变更时间（用于冲突解决中的 last-write-wins 判断） */
  @ApiProperty({ example: '2025-06-01T10:00:00Z' })
  @IsDateString()
  clientTimestamp!: string;

  /** create / update 时的数据载荷；delete 时可为空 */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}

export class PushChangesDto {
  @ApiProperty({ enum: ENTITY_TYPES, example: 'vocab-note' })
  @IsIn(ENTITY_TYPES)
  entityType!: SyncEntityType;

  @ApiProperty({ example: 'device-uuid-xxxx' })
  @IsString()
  @MaxLength(128)
  deviceId!: string;

  @ApiProperty({ type: [SyncItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncItemDto)
  items!: SyncItemDto[];
}
