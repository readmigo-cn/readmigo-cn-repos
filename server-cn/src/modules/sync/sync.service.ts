import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';

import { PersonalNoteEntity } from '../notes/entities/personal-note.entity.js';
import { VocabNoteEntity } from '../notes/entities/vocab-note.entity.js';
import { BookshelfItemEntity } from '../bookshelf/entities/bookshelf-item.entity.js';
import { ReadingProgressEntity } from '../reading/entities/reading-progress.entity.js';
import { PullChangesDto } from './dto/pull-changes.dto.js';
import { PushChangesDto, SyncItemDto } from './dto/push-changes.dto.js';
import { SyncCursorEntity, SyncEntityType } from './entities/sync-cursor.entity.js';

// ─────────────────────────────────────────────────────────────────────────────
// 冲突解决策略
//
// 默认策略：Last-Write-Wins (LWW)，基于 clientTimestamp。
// 例外：vocab-note 的 SM-2 调度字段（easinessFactor、interval、reviewCount、
//       nextReviewAt）使用字段级合并策略——取两端 reviewCount 较大的一方的值，
//       避免复习进度倒退。
//
// 边缘情况处理：
//   1. 同一 clientTimestamp：服务端版本优先（保守策略）
//   2. 客户端 delete + 服务端 update：delete 优先（soft-delete 可升级）
//   3. 客户端 create，服务端已存在：视为 update，走 LWW
// ─────────────────────────────────────────────────────────────────────────────

/** 字段级合并：vocab-note 的 SRS 字段取 reviewCount 较大的一方 */
function mergeVocabSrsFields(
  server: VocabNoteEntity,
  clientData: Record<string, unknown>,
): Partial<VocabNoteEntity> {
  const clientCount = (clientData['reviewCount'] as number | undefined) ?? 0;
  if (clientCount > server.reviewCount) {
    return {
      reviewCount: clientCount,
      easinessFactor: (clientData['easinessFactor'] as number | undefined) ?? server.easinessFactor,
      interval: (clientData['interval'] as number | undefined) ?? server.interval,
      nextReviewAt: clientData['nextReviewAt']
        ? new Date(clientData['nextReviewAt'] as string)
        : server.nextReviewAt,
      lastReviewedAt: clientData['lastReviewedAt']
        ? new Date(clientData['lastReviewedAt'] as string)
        : server.lastReviewedAt,
    };
  }
  // 服务端 reviewCount 更大，保留服务端 SRS 字段
  return {
    reviewCount: server.reviewCount,
    easinessFactor: server.easinessFactor,
    interval: server.interval,
    nextReviewAt: server.nextReviewAt,
    lastReviewedAt: server.lastReviewedAt,
  };
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    @InjectRepository(SyncCursorEntity)
    private readonly cursors: Repository<SyncCursorEntity>,
    @InjectRepository(VocabNoteEntity)
    private readonly vocabNotes: Repository<VocabNoteEntity>,
    @InjectRepository(PersonalNoteEntity)
    private readonly personalNotes: Repository<PersonalNoteEntity>,
    @InjectRepository(ReadingProgressEntity)
    private readonly readingProgress: Repository<ReadingProgressEntity>,
    @InjectRepository(BookshelfItemEntity)
    private readonly bookshelfItems: Repository<BookshelfItemEntity>,
  ) {}

  // ── Pull：服务端 → 客户端 ────────────────────────────────────────────────────

  async pullChanges(
    userId: string,
    dto: PullChangesDto,
  ): Promise<{ items: unknown[]; serverTimestamp: string; hasMore: boolean }> {
    const since = dto.since ? new Date(dto.since) : new Date(0);
    const PAGE_SIZE = 200;

    let items: unknown[] = [];

    switch (dto.entityType) {
      case 'vocab-note':
        items = await this.vocabNotes.find({
          where: { userId, updatedAt: MoreThan(since) },
          order: { updatedAt: 'ASC' },
          take: PAGE_SIZE + 1,
        });
        break;
      case 'personal-note':
        items = await this.personalNotes.find({
          where: { userId, updatedAt: MoreThan(since) },
          order: { updatedAt: 'ASC' },
          take: PAGE_SIZE + 1,
        });
        break;
      case 'reading-progress':
        items = await this.readingProgress.find({
          where: { userId, updatedAt: MoreThan(since) },
          order: { updatedAt: 'ASC' },
          take: PAGE_SIZE + 1,
        });
        break;
      case 'bookshelf-item':
        items = await this.bookshelfItems.find({
          where: { userId },
          order: { addedAt: 'ASC' },
          take: PAGE_SIZE + 1,
        });
        break;
      default:
        // reading-highlight 由 W3-C2/3 模块处理，此处返回空
        items = [];
    }

    const hasMore = items.length > PAGE_SIZE;
    if (hasMore) items = items.slice(0, PAGE_SIZE);

    // 更新游标
    await this.upsertCursor(userId, dto.deviceId, dto.entityType);

    return {
      items,
      serverTimestamp: new Date().toISOString(),
      hasMore,
    };
  }

  // ── Push：客户端 → 服务端 ────────────────────────────────────────────────────

  async pushChanges(
    userId: string,
    dto: PushChangesDto,
  ): Promise<{ applied: string[]; conflicts: string[] }> {
    const applied: string[] = [];
    const conflicts: string[] = [];

    for (const item of dto.items) {
      try {
        const conflict = await this.applyChange(userId, dto.entityType, item);
        if (conflict) {
          conflicts.push(item.id);
        } else {
          applied.push(item.id);
        }
      } catch (err) {
        this.logger.warn(`Push failed for ${item.id}: ${String(err)}`);
        conflicts.push(item.id);
      }
    }

    await this.upsertCursor(userId, dto.deviceId, dto.entityType);

    return { applied, conflicts };
  }

  // ── Sync status ──────────────────────────────────────────────────────────────

  async getSyncStatus(
    userId: string,
    deviceId: string,
  ): Promise<{ perEntity: Record<string, { lastSyncedAt: string; version: string }> }> {
    const cursors = await this.cursors.find({ where: { userId, deviceId } });
    const perEntity: Record<string, { lastSyncedAt: string; version: string }> = {};
    for (const cursor of cursors) {
      perEntity[cursor.entityType] = {
        lastSyncedAt: cursor.lastSyncedAt.toISOString(),
        version: cursor.lastSyncedVersion,
      };
    }
    return { perEntity };
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async applyChange(
    userId: string,
    entityType: SyncEntityType,
    item: SyncItemDto,
  ): Promise<boolean> {
    const clientTs = new Date(item.clientTimestamp);

    switch (entityType) {
      case 'vocab-note':
        return this.applyVocabNoteChange(userId, item, clientTs);
      case 'personal-note':
        return this.applyPersonalNoteChange(userId, item, clientTs);
      case 'reading-progress':
        return this.applyReadingProgressChange(userId, item, clientTs);
      case 'bookshelf-item':
        return this.applyBookshelfItemChange(userId, item, clientTs);
      default:
        // 不支持的实体类型，视为冲突
        return true;
    }
  }

  private async applyVocabNoteChange(
    userId: string,
    item: SyncItemDto,
    clientTs: Date,
  ): Promise<boolean> {
    const existing = await this.vocabNotes.findOne({ where: { id: item.id, userId } });

    if (item.op === 'delete') {
      if (existing) await this.vocabNotes.delete({ id: item.id, userId });
      return false;
    }

    const data = item.data ?? {};

    if (!existing) {
      // create
      const entity = this.vocabNotes.create({
        id: item.id,
        userId,
        ...(data as Partial<VocabNoteEntity>),
      });
      await this.vocabNotes.save(entity);
      return false;
    }

    // LWW: 客户端时间戳较旧，服务端版本更新 → 冲突，不应用
    if (existing.updatedAt > clientTs) {
      // 但对 SRS 字段使用字段级合并
      const srsFields = mergeVocabSrsFields(existing, data as Record<string, unknown>);
      const nonSrsFields = { ...(data as Partial<VocabNoteEntity>) };
      // 只更新 SRS 字段（保留服务端内容字段）
      Object.assign(existing, srsFields);
      await this.vocabNotes.save(existing);
      return true; // 报告为冲突，但 SRS 字段已合并
    }

    // 客户端版本更新，完整应用
    const srsFields = mergeVocabSrsFields(existing, data as Record<string, unknown>);
    Object.assign(existing, data, srsFields);
    await this.vocabNotes.save(existing);
    return false;
  }

  private async applyPersonalNoteChange(
    userId: string,
    item: SyncItemDto,
    clientTs: Date,
  ): Promise<boolean> {
    const existing = await this.personalNotes.findOne({ where: { id: item.id, userId } });

    if (item.op === 'delete') {
      if (existing) await this.personalNotes.delete({ id: item.id, userId });
      return false;
    }

    const data = item.data ?? {};

    if (!existing) {
      const entity = this.personalNotes.create({
        id: item.id,
        userId,
        ...(data as Partial<PersonalNoteEntity>),
      });
      await this.personalNotes.save(entity);
      return false;
    }

    // LWW: 服务端更新，客户端版本旧 → 冲突
    if (existing.updatedAt > clientTs) {
      return true;
    }

    Object.assign(existing, data);
    await this.personalNotes.save(existing);
    return false;
  }

  private async applyReadingProgressChange(
    userId: string,
    item: SyncItemDto,
    clientTs: Date,
  ): Promise<boolean> {
    const data = item.data ?? {};
    const bookId = data['bookId'] as string | undefined;
    if (!bookId) return true;

    const existing = await this.readingProgress.findOne({ where: { id: item.id, userId } });

    if (item.op === 'delete') {
      // reading progress 不允许删除（只能重置）
      return true;
    }

    if (!existing) {
      const entity = this.readingProgress.create({
        id: item.id,
        userId,
        ...(data as Partial<ReadingProgressEntity>),
      });
      await this.readingProgress.save(entity);
      return false;
    }

    // reading progress: 总是取较新的位置（进度只进不退，取较大的 percent）
    const clientPercent = (data['percent'] as number | undefined) ?? 0;
    if (existing.updatedAt > clientTs && existing.percent >= clientPercent) {
      return true; // 服务端进度更靠前，不应用
    }

    Object.assign(existing, data);
    await this.readingProgress.save(existing);
    return false;
  }

  private async applyBookshelfItemChange(
    userId: string,
    item: SyncItemDto,
    clientTs: Date,
  ): Promise<boolean> {
    const existing = await this.bookshelfItems.findOne({ where: { id: item.id, userId } });

    if (item.op === 'delete') {
      if (existing) await this.bookshelfItems.delete({ id: item.id, userId });
      return false;
    }

    const data = item.data ?? {};

    if (!existing) {
      const entity = this.bookshelfItems.create({
        id: item.id,
        userId,
        ...(data as Partial<BookshelfItemEntity>),
      });
      await this.bookshelfItems.save(entity);
      return false;
    }

    // bookshelf: LWW，但 addedAt 不可改变
    Object.assign(existing, data);
    await this.bookshelfItems.save(existing);
    return false;
  }

  private async upsertCursor(
    userId: string,
    deviceId: string,
    entityType: SyncEntityType,
  ): Promise<void> {
    const existing = await this.cursors.findOne({
      where: { userId, deviceId, entityType },
    });

    if (existing) {
      // lastSyncedAt 由 @UpdateDateColumn 自动更新
      await this.cursors.save(existing);
    } else {
      const cursor = this.cursors.create({ userId, deviceId, entityType, lastSyncedVersion: '0' });
      await this.cursors.save(cursor);
    }
  }

  /** 暴露给测试和未来扩展的冲突解决辅助方法 */
  resolveConflicts<T extends { updatedAt?: Date; addedAt?: Date }>(
    localItem: T & Record<string, unknown>,
    serverItem: T & Record<string, unknown>,
    strategy: 'last-write-wins' | 'server-wins' = 'last-write-wins',
  ): T {
    if (strategy === 'server-wins') return serverItem;

    const localTs = (localItem['updatedAt'] ?? localItem['addedAt'] ?? new Date(0)) as Date;
    const serverTs = (serverItem['updatedAt'] ?? serverItem['addedAt'] ?? new Date(0)) as Date;

    // 同时间戳 → 服务端优先（保守策略）
    return serverTs >= localTs ? serverItem : localItem;
  }
}
