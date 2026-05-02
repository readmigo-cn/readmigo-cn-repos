import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { BookshelfItemEntity } from '../bookshelf/entities/bookshelf-item.entity.js';
import { PersonalNoteEntity } from '../notes/entities/personal-note.entity.js';
import { VocabNoteEntity } from '../notes/entities/vocab-note.entity.js';
import { ReadingProgressEntity } from '../reading/entities/reading-progress.entity.js';
import { SyncCursorEntity } from './entities/sync-cursor.entity.js';
import { SyncService } from './sync.service.js';

function makeRepo<T>(overrides: Partial<Repository<T>> = {}): jest.Mocked<Repository<T>> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((dto) => ({ ...dto }) as T),
    save: jest.fn((entity) => Promise.resolve(entity) as Promise<T>),
    delete: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<Repository<T>>;
}

describe('SyncService', () => {
  let service: SyncService;
  let cursorRepo: jest.Mocked<Repository<SyncCursorEntity>>;
  let vocabRepo: jest.Mocked<Repository<VocabNoteEntity>>;
  let personalNoteRepo: jest.Mocked<Repository<PersonalNoteEntity>>;
  let readingProgressRepo: jest.Mocked<Repository<ReadingProgressEntity>>;
  let bookshelfRepo: jest.Mocked<Repository<BookshelfItemEntity>>;

  beforeEach(async () => {
    cursorRepo = makeRepo<SyncCursorEntity>();
    vocabRepo = makeRepo<VocabNoteEntity>();
    personalNoteRepo = makeRepo<PersonalNoteEntity>();
    readingProgressRepo = makeRepo<ReadingProgressEntity>();
    bookshelfRepo = makeRepo<BookshelfItemEntity>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: getRepositoryToken(SyncCursorEntity), useValue: cursorRepo },
        { provide: getRepositoryToken(VocabNoteEntity), useValue: vocabRepo },
        { provide: getRepositoryToken(PersonalNoteEntity), useValue: personalNoteRepo },
        { provide: getRepositoryToken(ReadingProgressEntity), useValue: readingProgressRepo },
        { provide: getRepositoryToken(BookshelfItemEntity), useValue: bookshelfRepo },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
  });

  // ── pullChanges ────────────────────────────────────────────────────────────

  it('pullChanges: 返回 vocab-note 并更新 cursor', async () => {
    const mockNotes = [{ id: 'v1', word: 'ephemeral', userId: 'u1', updatedAt: new Date() }];
    vocabRepo.find.mockResolvedValue(mockNotes as VocabNoteEntity[]);
    cursorRepo.findOne.mockResolvedValue(null);
    cursorRepo.create.mockReturnValue({} as SyncCursorEntity);
    cursorRepo.save.mockResolvedValue({} as SyncCursorEntity);

    const result = await service.pullChanges('u1', {
      entityType: 'vocab-note',
      deviceId: 'device-1',
    });

    expect(result.items).toHaveLength(1);
    expect(result.hasMore).toBe(false);
    expect(result.serverTimestamp).toBeDefined();
    expect(cursorRepo.save).toHaveBeenCalled();
  });

  it('pullChanges: hasMore=true 当结果超过 200 条', async () => {
    // 构造 201 条数据
    const mockNotes = Array.from({ length: 201 }, (_, i) => ({
      id: `v${i}`,
      word: `word${i}`,
      userId: 'u1',
      updatedAt: new Date(),
    }));
    vocabRepo.find.mockResolvedValue(mockNotes as VocabNoteEntity[]);
    cursorRepo.findOne.mockResolvedValue(null);
    cursorRepo.create.mockReturnValue({} as SyncCursorEntity);
    cursorRepo.save.mockResolvedValue({} as SyncCursorEntity);

    const result = await service.pullChanges('u1', {
      entityType: 'vocab-note',
      deviceId: 'device-1',
    });

    expect(result.items).toHaveLength(200);
    expect(result.hasMore).toBe(true);
  });

  // ── resolveConflicts ───────────────────────────────────────────────────────

  it('resolveConflicts: last-write-wins — 本地更新时间较新时返回本地', () => {
    const local = { id: '1', updatedAt: new Date('2025-06-02'), content: 'local' };
    const server = { id: '1', updatedAt: new Date('2025-06-01'), content: 'server' };

    const result = service.resolveConflicts(local, server, 'last-write-wins');
    expect(result.content).toBe('local');
  });

  it('resolveConflicts: last-write-wins — 服务端更新时间较新时返回服务端', () => {
    const local = { id: '1', updatedAt: new Date('2025-06-01'), content: 'local' };
    const server = { id: '1', updatedAt: new Date('2025-06-02'), content: 'server' };

    const result = service.resolveConflicts(local, server, 'last-write-wins');
    expect(result.content).toBe('server');
  });

  it('resolveConflicts: 时间戳相同时服务端优先（保守策略）', () => {
    const ts = new Date('2025-06-01');
    const local = { id: '1', updatedAt: ts, content: 'local' };
    const server = { id: '1', updatedAt: ts, content: 'server' };

    const result = service.resolveConflicts(local, server, 'last-write-wins');
    expect(result.content).toBe('server');
  });

  it('resolveConflicts: server-wins 策略总是返回服务端', () => {
    const local = { id: '1', updatedAt: new Date('2025-12-31'), content: 'local' };
    const server = { id: '1', updatedAt: new Date('2025-01-01'), content: 'server' };

    const result = service.resolveConflicts(local, server, 'server-wins');
    expect(result.content).toBe('server');
  });

  // ── pushChanges ────────────────────────────────────────────────────────────

  it('pushChanges: delete 操作成功应用', async () => {
    vocabRepo.findOne.mockResolvedValue({ id: 'v1', userId: 'u1' } as VocabNoteEntity);
    vocabRepo.delete.mockResolvedValue({ affected: 1, raw: [] });
    cursorRepo.findOne.mockResolvedValue(null);
    cursorRepo.create.mockReturnValue({} as SyncCursorEntity);
    cursorRepo.save.mockResolvedValue({} as SyncCursorEntity);

    const result = await service.pushChanges('u1', {
      entityType: 'vocab-note',
      deviceId: 'device-1',
      items: [{ id: 'v1', op: 'delete', clientTimestamp: new Date().toISOString() }],
    });

    expect(result.applied).toContain('v1');
    expect(result.conflicts).toHaveLength(0);
  });
});
