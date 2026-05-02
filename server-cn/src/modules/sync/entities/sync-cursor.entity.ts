import { Column, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type SyncEntityType =
  | 'vocab-note'
  | 'personal-note'
  | 'reading-progress'
  | 'reading-highlight'
  | 'bookshelf-item';

/**
 * SyncCursor — 记录某设备对某类实体的最后同步位置
 * 用于增量 pull：客户端提交 since，服务端返回 since 之后的变更。
 */
@Entity('sync_cursors')
@Index(['userId', 'deviceId', 'entityType'], { unique: true })
export class SyncCursorEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  /** 客户端设备标识，由客户端生成并持久化（UUID 或设备指纹） */
  @Column({ length: 128 })
  deviceId!: string;

  @Column({ length: 32 })
  entityType!: SyncEntityType;

  @UpdateDateColumn()
  lastSyncedAt!: Date;

  /**
   * 服务端序列号（单调递增版本号），初始为 0。
   * 用于在同一毫秒内有多条变更时，保证顺序一致性。
   */
  @Column({ type: 'bigint', default: 0 })
  lastSyncedVersion!: string;
}
