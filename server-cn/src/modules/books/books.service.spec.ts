// books.service.spec.ts
// Unit tests for BooksService. All TypeORM repositories are fully mocked.
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { BooksService } from './books.service.js';
import { BookAssetEntity } from './entities/book-asset.entity.js';
import { BookChapterEntity } from './entities/book-chapter.entity.js';
import { BookRatingEntity } from './entities/book-rating.entity.js';
import { BookEntity } from './entities/book.entity.js';

type MockRepo<T> = {
  find: jest.MockedFunction<() => Promise<T[]>>;
  findOne: jest.MockedFunction<() => Promise<T | null>>;
  save: jest.MockedFunction<(e: T) => Promise<T>>;
  create: jest.MockedFunction<(partial: Partial<T>) => T>;
  createQueryBuilder: jest.MockedFunction<() => MockQB>;
  delete?: jest.MockedFunction<() => Promise<{ affected?: number }>>;
};

interface MockQB {
  where: jest.MockedFunction<() => MockQB>;
  andWhere: jest.MockedFunction<() => MockQB>;
  select: jest.MockedFunction<() => MockQB>;
  addSelect: jest.MockedFunction<() => MockQB>;
  orderBy: jest.MockedFunction<() => MockQB>;
  skip: jest.MockedFunction<() => MockQB>;
  take: jest.MockedFunction<() => MockQB>;
  getManyAndCount: jest.MockedFunction<() => Promise<[BookEntity[], number]>>;
  getMany: jest.MockedFunction<() => Promise<BookEntity[]>>;
  getRawOne: jest.MockedFunction<() => Promise<{ avg: string; cnt: string } | undefined>>;
  getCount: jest.MockedFunction<() => Promise<number>>;
}

function makeQB(overrides?: Partial<MockQB>): MockQB {
  const qb: MockQB = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getMany: jest.fn().mockResolvedValue([]),
    getRawOne: jest.fn().mockResolvedValue(undefined),
    getCount: jest.fn().mockResolvedValue(0),
    ...overrides,
  };
  return qb;
}

function makeRepo<T>(overrides?: Partial<MockRepo<T>>): MockRepo<T> {
  const qb = makeQB();
  return {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
    create: jest.fn().mockImplementation((p) => p),
    createQueryBuilder: jest.fn().mockReturnValue(qb),
    ...overrides,
  };
}

describe('BooksService', () => {
  let service: BooksService;
  let booksRepo: MockRepo<BookEntity>;
  let chaptersRepo: MockRepo<BookChapterEntity>;
  let ratingsRepo: MockRepo<BookRatingEntity>;

  beforeEach(async () => {
    booksRepo = makeRepo<BookEntity>();
    chaptersRepo = makeRepo<BookChapterEntity>();
    const assetsRepo = makeRepo<BookAssetEntity>();
    ratingsRepo = makeRepo<BookRatingEntity>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        { provide: getRepositoryToken(BookEntity), useValue: booksRepo },
        { provide: getRepositoryToken(BookChapterEntity), useValue: chaptersRepo },
        { provide: getRepositoryToken(BookAssetEntity), useValue: assetsRepo },
        { provide: getRepositoryToken(BookRatingEntity), useValue: ratingsRepo },
      ],
    }).compile();

    service = module.get(BooksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('list()', () => {
    it('returns paged result with total and metadata', async () => {
      const books = [{ id: 'b1' } as BookEntity, { id: 'b2' } as BookEntity];
      const qb = makeQB({ getManyAndCount: jest.fn().mockResolvedValue([books, 42]) });
      booksRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.list({ page: 1, pageSize: 20 });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(42);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('applies language filter via andWhere', async () => {
      const qb = makeQB({ getManyAndCount: jest.fn().mockResolvedValue([[], 0]) });
      booksRepo.createQueryBuilder.mockReturnValue(qb);

      await service.list({ page: 1, pageSize: 20, language: 'zh-CN' });

      expect(qb.andWhere).toHaveBeenCalledWith(expect.stringContaining('language'), expect.objectContaining({ lang: 'zh-CN' }));
    });
  });

  describe('getBySlug()', () => {
    it('throws NotFoundException for unknown slug', async () => {
      booksRepo.findOne.mockResolvedValue(null);
      await expect(service.getBySlug('no-book')).rejects.toThrow(NotFoundException);
    });

    it('returns book when found', async () => {
      const book = { id: 'b1', slug: 'great-gatsby' } as BookEntity;
      booksRepo.findOne.mockResolvedValue(book);
      const result = await service.getBySlug('great-gatsby');
      expect(result.slug).toBe('great-gatsby');
    });
  });

  describe('getChapter()', () => {
    it('throws NotFoundException when book does not exist', async () => {
      booksRepo.findOne.mockResolvedValue(null);
      await expect(service.getChapter('missing-id', 0)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when chapter index not found', async () => {
      booksRepo.findOne.mockResolvedValue({ id: 'b1' } as BookEntity);
      chaptersRepo.findOne.mockResolvedValue(null);
      await expect(service.getChapter('b1', 99)).rejects.toThrow(NotFoundException);
    });

    it('returns chapter when both book and chapter exist', async () => {
      const chapter = { id: 'ch1', chapterIndex: 0 } as BookChapterEntity;
      booksRepo.findOne.mockResolvedValue({ id: 'b1' } as BookEntity);
      chaptersRepo.findOne.mockResolvedValue(chapter);
      const result = await service.getChapter('b1', 0);
      expect(result.id).toBe('ch1');
    });
  });

  describe('rate()', () => {
    it('creates a new rating when none exists', async () => {
      const book = { id: 'b1', avgRating: 0, ratingsCount: 0 } as BookEntity;
      booksRepo.findOne.mockResolvedValue(book);
      ratingsRepo.findOne.mockResolvedValue(null);
      const rawQB = makeQB({ getRawOne: jest.fn().mockResolvedValue({ avg: '4.5', cnt: '1' }) });
      ratingsRepo.createQueryBuilder.mockReturnValue(rawQB);
      booksRepo.createQueryBuilder.mockReturnValue(makeQB());

      await service.rate('user1', 'b1', { rating: 5 });

      expect(ratingsRepo.save).toHaveBeenCalled();
    });

    it('updates existing rating instead of inserting duplicate', async () => {
      const book = { id: 'b1', avgRating: 4, ratingsCount: 1 } as BookEntity;
      const existing = { id: 'r1', userId: 'user1', bookId: 'b1', rating: 3 } as BookRatingEntity;
      booksRepo.findOne.mockResolvedValue(book);
      ratingsRepo.findOne.mockResolvedValue(existing);
      const rawQB = makeQB({ getRawOne: jest.fn().mockResolvedValue({ avg: '5', cnt: '1' }) });
      ratingsRepo.createQueryBuilder.mockReturnValue(rawQB);
      booksRepo.createQueryBuilder.mockReturnValue(makeQB());

      await service.rate('user1', 'b1', { rating: 5, comment: 'Great!' });

      expect(existing.rating).toBe(5);
      expect(existing.comment).toBe('Great!');
    });

    it('throws NotFoundException for unknown book', async () => {
      booksRepo.findOne.mockResolvedValue(null);
      await expect(service.rate('user1', 'missing', { rating: 3 })).rejects.toThrow(NotFoundException);
    });
  });

  describe('search()', () => {
    it('returns results matching the query', async () => {
      const books = [{ id: 'b1', title: 'Great Gatsby' } as BookEntity];
      const qb = makeQB({ getMany: jest.fn().mockResolvedValue(books) });
      booksRepo.createQueryBuilder.mockReturnValue(qb);

      const results = await service.search({ q: 'Gatsby' });
      expect(results).toHaveLength(1);
    });
  });
});
