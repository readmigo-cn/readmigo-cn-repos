// bookshelf.service.spec.ts
// Unit tests for BookshelfService. Repository is fully mocked.
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { BookshelfService } from './bookshelf.service.js';
import { BookshelfItemEntity } from './entities/bookshelf-item.entity.js';

type MockRepo = {
  find: jest.MockedFunction<() => Promise<BookshelfItemEntity[]>>;
  findOne: jest.MockedFunction<() => Promise<BookshelfItemEntity | null>>;
  save: jest.MockedFunction<(e: BookshelfItemEntity) => Promise<BookshelfItemEntity>>;
  create: jest.MockedFunction<(p: Partial<BookshelfItemEntity>) => BookshelfItemEntity>;
  delete: jest.MockedFunction<() => Promise<{ affected?: number }>>;
};

function makeRepo(overrides?: Partial<MockRepo>): MockRepo {
  return {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
    create: jest.fn().mockImplementation((p) => p as BookshelfItemEntity),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    ...overrides,
  };
}

describe('BookshelfService', () => {
  let service: BookshelfService;
  let repo: MockRepo;

  beforeEach(async () => {
    repo = makeRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookshelfService,
        { provide: getRepositoryToken(BookshelfItemEntity), useValue: repo },
      ],
    }).compile();

    service = module.get(BookshelfService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('add()', () => {
    it('creates shelf item with want-to-read status', async () => {
      repo.findOne.mockResolvedValue(null);
      await service.add('user1', 'book1');
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user1', bookId: 'book1', status: 'want-to-read' }),
      );
      expect(repo.save).toHaveBeenCalled();
    });

    it('throws ConflictException when book already on shelf', async () => {
      repo.findOne.mockResolvedValue({ id: 'item1' } as BookshelfItemEntity);
      await expect(service.add('user1', 'book1')).rejects.toThrow(ConflictException);
    });
  });

  describe('updateStatus()', () => {
    it('sets finishedAt when status changes to finished', async () => {
      const item = { id: 'i1', status: 'reading', finishedAt: null } as unknown as BookshelfItemEntity;
      repo.findOne.mockResolvedValue(item);

      await service.updateStatus('user1', 'book1', 'finished');

      expect(item.status).toBe('finished');
      expect(item.finishedAt).toBeInstanceOf(Date);
    });

    it('throws NotFoundException when item not on shelf', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.updateStatus('user1', 'book1', 'reading')).rejects.toThrow(NotFoundException);
    });
  });

  describe('toggleFavorite()', () => {
    it('flips isFavorite from false to true', async () => {
      const item = { id: 'i1', isFavorite: false } as BookshelfItemEntity;
      repo.findOne.mockResolvedValue(item);

      const result = await service.toggleFavorite('user1', 'book1');

      expect(item.isFavorite).toBe(true);
      expect(repo.save).toHaveBeenCalledWith(item);
    });

    it('flips isFavorite from true to false', async () => {
      const item = { id: 'i1', isFavorite: true } as BookshelfItemEntity;
      repo.findOne.mockResolvedValue(item);

      await service.toggleFavorite('user1', 'book1');
      expect(item.isFavorite).toBe(false);
    });
  });

  describe('remove()', () => {
    it('successfully removes an item', async () => {
      repo.delete.mockResolvedValue({ affected: 1 });
      await expect(service.remove('user1', 'book1')).resolves.toBeUndefined();
    });

    it('throws NotFoundException when item not found', async () => {
      repo.delete.mockResolvedValue({ affected: 0 });
      await expect(service.remove('user1', 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('list()', () => {
    it('lists shelf items for a user', async () => {
      const items = [{ id: 'i1', userId: 'user1' } as BookshelfItemEntity];
      repo.find.mockResolvedValue(items);
      const result = await service.list('user1');
      expect(result).toHaveLength(1);
    });

    it('filters by status when provided', async () => {
      repo.find.mockResolvedValue([]);
      await service.list('user1', { status: 'reading' });
      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'reading' }) }),
      );
    });
  });
});
