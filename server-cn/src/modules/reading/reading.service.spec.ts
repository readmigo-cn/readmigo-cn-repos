// reading.service.spec.ts
// Unit tests for ReadingService. All repositories are fully mocked.
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { ReadingService } from './reading.service.js';
import { ReadingHighlightEntity } from './entities/reading-highlight.entity.js';
import { ReadingProgressEntity } from './entities/reading-progress.entity.js';
import { ReadingSessionEntity } from './entities/reading-session.entity.js';

type MockRepo<T> = {
  find: jest.MockedFunction<() => Promise<T[]>>;
  findOne: jest.MockedFunction<() => Promise<T | null>>;
  save: jest.MockedFunction<(e: T) => Promise<T>>;
  create: jest.MockedFunction<(p: Partial<T>) => T>;
  delete: jest.MockedFunction<(id: string) => Promise<void>>;
  createQueryBuilder: jest.MockedFunction<() => MockQB>;
};

interface MockQB {
  where: jest.MockedFunction<() => MockQB>;
  andWhere: jest.MockedFunction<() => MockQB>;
  select: jest.MockedFunction<() => MockQB>;
  addSelect: jest.MockedFunction<() => MockQB>;
  getRawOne: jest.MockedFunction<() => Promise<unknown>>;
  getCount: jest.MockedFunction<() => Promise<number>>;
}

function makeQB(overrides?: Partial<MockQB>): MockQB {
  return {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue(undefined),
    getCount: jest.fn().mockResolvedValue(0),
    ...overrides,
  };
}

function makeRepo<T>(overrides?: Partial<MockRepo<T>>): MockRepo<T> {
  return {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
    create: jest.fn().mockImplementation((p) => p as T),
    delete: jest.fn().mockResolvedValue(undefined),
    createQueryBuilder: jest.fn().mockReturnValue(makeQB()),
    ...overrides,
  };
}

describe('ReadingService', () => {
  let service: ReadingService;
  let progressRepo: MockRepo<ReadingProgressEntity>;
  let sessionsRepo: MockRepo<ReadingSessionEntity>;
  let highlightsRepo: MockRepo<ReadingHighlightEntity>;

  beforeEach(async () => {
    progressRepo = makeRepo<ReadingProgressEntity>();
    sessionsRepo = makeRepo<ReadingSessionEntity>();
    highlightsRepo = makeRepo<ReadingHighlightEntity>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReadingService,
        { provide: getRepositoryToken(ReadingProgressEntity), useValue: progressRepo },
        { provide: getRepositoryToken(ReadingSessionEntity), useValue: sessionsRepo },
        { provide: getRepositoryToken(ReadingHighlightEntity), useValue: highlightsRepo },
      ],
    }).compile();

    service = module.get(ReadingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateProgress()', () => {
    it('creates new progress row when none exists', async () => {
      progressRepo.findOne.mockResolvedValue(null);
      const dto = { currentChapterIndex: 2, percentComplete: 0.3 };
      await service.updateProgress('user1', 'book1', dto);
      expect(progressRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user1', bookId: 'book1' }),
      );
      expect(progressRepo.save).toHaveBeenCalled();
    });

    it('updates existing progress row without creating duplicate', async () => {
      const existing = {
        id: 'p1', userId: 'user1', bookId: 'book1',
        currentChapterIndex: 0, percentComplete: 0.1,
        currentParagraphIndex: 0, scrollOffset: 0, lastReadAt: null,
      } as unknown as ReadingProgressEntity;
      progressRepo.findOne.mockResolvedValue(existing);

      const dto = { currentChapterIndex: 5, percentComplete: 0.6 };
      await service.updateProgress('user1', 'book1', dto);

      expect(progressRepo.create).not.toHaveBeenCalled();
      expect(existing.currentChapterIndex).toBe(5);
      expect(existing.percentComplete).toBe(0.6);
    });
  });

  describe('startSession() / endSession()', () => {
    it('starts a session by saving a new entity', async () => {
      await service.startSession('user1', { bookId: 'book1' });
      expect(sessionsRepo.save).toHaveBeenCalled();
    });

    it('throws NotFoundException when ending unknown session', async () => {
      sessionsRepo.findOne.mockResolvedValue(null);
      await expect(
        service.endSession('user1', 'missing-id', { durationSeconds: 60 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when session belongs to another user', async () => {
      const session = { id: 's1', userId: 'other-user', bookId: 'b1' } as ReadingSessionEntity;
      sessionsRepo.findOne.mockResolvedValue(session);
      await expect(
        service.endSession('user1', 's1', { durationSeconds: 60 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('records duration and updates progress time on success', async () => {
      const session = { id: 's1', userId: 'user1', bookId: 'book1' } as ReadingSessionEntity;
      sessionsRepo.findOne.mockResolvedValue(session);
      const progressRow = {
        id: 'p1', userId: 'user1', bookId: 'book1',
        totalReadMinutes: 0, sessionsCount: 0, lastReadAt: null,
      } as unknown as ReadingProgressEntity;
      progressRepo.findOne.mockResolvedValue(progressRow);

      await service.endSession('user1', 's1', { durationSeconds: 120 });

      expect(session.durationSeconds).toBe(120);
      expect(progressRow.totalReadMinutes).toBe(2);
      expect(progressRow.sessionsCount).toBe(1);
    });
  });

  describe('createHighlight()', () => {
    it('creates and saves a highlight', async () => {
      const dto = { bookId: 'book1', chapterIndex: 1, text: 'Hello world', color: 'yellow' as const };
      await service.createHighlight('user1', dto);
      expect(highlightsRepo.save).toHaveBeenCalled();
    });
  });

  describe('deleteHighlight()', () => {
    it('throws NotFoundException for unknown highlight', async () => {
      highlightsRepo.findOne.mockResolvedValue(null);
      await expect(service.deleteHighlight('user1', 'missing')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for highlight owned by another user', async () => {
      const hl = { id: 'h1', userId: 'other' } as ReadingHighlightEntity;
      highlightsRepo.findOne.mockResolvedValue(hl);
      await expect(service.deleteHighlight('user1', 'h1')).rejects.toThrow(ForbiddenException);
    });

    it('deletes highlight when ownership verified', async () => {
      const hl = { id: 'h1', userId: 'user1' } as ReadingHighlightEntity;
      highlightsRepo.findOne.mockResolvedValue(hl);
      await service.deleteHighlight('user1', 'h1');
      expect(highlightsRepo.delete).toHaveBeenCalledWith('h1');
    });
  });

  describe('getReadingStats()', () => {
    it('returns zeroed stats when no data exists', async () => {
      progressRepo.find.mockResolvedValue([]);
      const qb = makeQB({ getCount: jest.fn().mockResolvedValue(0) });
      sessionsRepo.createQueryBuilder.mockReturnValue(qb);

      const stats = await service.getReadingStats('user1', 'all');

      expect(stats.totalReadMinutes).toBe(0);
      expect(stats.booksFinished).toBe(0);
      expect(stats.totalSessions).toBe(0);
    });

    it('counts books as finished when percentComplete >= 0.99', async () => {
      progressRepo.find.mockResolvedValue([
        { percentComplete: 1.0, totalReadMinutes: 60 } as ReadingProgressEntity,
        { percentComplete: 0.5, totalReadMinutes: 30 } as ReadingProgressEntity,
      ]);
      const qb = makeQB({ getCount: jest.fn().mockResolvedValue(2) });
      sessionsRepo.createQueryBuilder.mockReturnValue(qb);

      const stats = await service.getReadingStats('user1', 'month');

      expect(stats.booksFinished).toBe(1);
      expect(stats.totalReadMinutes).toBe(90);
    });
  });
});
