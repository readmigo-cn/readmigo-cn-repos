// books.controller.spec.ts
// W1-C6 unit test for BooksController. The repository layer is fully mocked;
// Phase 2 will add e2e tests against the seeded demo dataset.
import { Test, TestingModule } from '@nestjs/testing';

import { BooksController } from './books.controller.js';
import { BooksService } from './books.service.js';

describe('BooksController', () => {
  let controller: BooksController;
  let booksService: jest.Mocked<Pick<BooksService, 'list' | 'findOne' | 'search'>>;

  beforeEach(async () => {
    booksService = {
      list: jest.fn(),
      findOne: jest.fn(),
      search: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BooksController],
      providers: [{ provide: BooksService, useValue: booksService }],
    }).compile();

    controller = module.get(BooksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('list() coerces page/pageSize strings to numbers and forwards language filter', async () => {
    booksService.list.mockResolvedValue([] as never);
    await controller.list('2', '10', 'en');
    expect(booksService.list).toHaveBeenCalledWith(2, 10, 'en');
  });

  it('list() defaults to page=1 pageSize=20 when query params are missing', async () => {
    booksService.list.mockResolvedValue([] as never);
    await controller.list();
    expect(booksService.list).toHaveBeenCalledWith(1, 20, undefined);
  });

  it('search() forwards keyword (empty string when missing)', async () => {
    booksService.search.mockResolvedValue([] as never);
    await controller.search(undefined as never);
    expect(booksService.search).toHaveBeenCalledWith('');
  });

  it('getBook() forwards the id param', async () => {
    booksService.findOne.mockResolvedValue({ id: 'book-1' } as never);
    const result = await controller.getBook('book-1');
    expect(booksService.findOne).toHaveBeenCalledWith('book-1');
    expect(result).toEqual({ id: 'book-1' });
  });
});
