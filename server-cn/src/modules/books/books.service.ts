import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';

import { BookAssetEntity } from './entities/book-asset.entity.js';
import { BookChapterEntity } from './entities/book-chapter.entity.js';
import { BookRatingEntity } from './entities/book-rating.entity.js';
import { BookEntity } from './entities/book.entity.js';
import type { ListBooksDto } from './dto/list-books.dto.js';
import type { RateBookDto } from './dto/rate-book.dto.js';
import type { SearchBooksDto } from './dto/search-books.dto.js';

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(BookEntity) private readonly books: Repository<BookEntity>,
    @InjectRepository(BookChapterEntity) private readonly chapters: Repository<BookChapterEntity>,
    @InjectRepository(BookAssetEntity) private readonly assets: Repository<BookAssetEntity>,
    @InjectRepository(BookRatingEntity) private readonly ratings: Repository<BookRatingEntity>,
  ) {}

  async list(dto: ListBooksDto): Promise<PagedResult<BookEntity>> {
    const page = dto.page ?? 1;
    const pageSize = dto.pageSize ?? 20;
    const sortBy = dto.sortBy ?? 'createdAt';

    const where: Record<string, unknown> = { isPublished: true };
    if (dto.language) where['language'] = dto.language;
    if (dto.cefrLevel) where['cefrLevel'] = dto.cefrLevel;
    if (dto.category) where['category'] = dto.category;

    let qb = this.books
      .createQueryBuilder('book')
      .where('book.isPublished = :pub', { pub: true });

    if (dto.language) qb = qb.andWhere('book.language = :lang', { lang: dto.language });
    if (dto.cefrLevel) qb = qb.andWhere('book.cefrLevel = :cefr', { cefr: dto.cefrLevel });
    if (dto.category) qb = qb.andWhere('book.category = :cat', { cat: dto.category });
    if (dto.search) {
      const like = `%${dto.search.trim()}%`;
      qb = qb.andWhere('(book.title ILIKE :s OR book.author ILIKE :s)', { s: like });
    }

    const orderDir: 'ASC' | 'DESC' = sortBy === 'title' ? 'ASC' : 'DESC';
    qb = qb
      .orderBy(`book.${sortBy}`, orderDir)
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, pageSize };
  }

  async getBySlug(slug: string): Promise<BookEntity> {
    const book = await this.books.findOne({ where: { slug, isPublished: true } });
    if (!book) throw new NotFoundException('book_not_found');
    return book;
  }

  async getById(id: string): Promise<BookEntity> {
    const book = await this.books.findOne({ where: { id, isPublished: true } });
    if (!book) throw new NotFoundException('book_not_found');
    return book;
  }

  // kept for backward compat with existing controller spec
  async findOne(id: string): Promise<BookEntity> {
    return this.getById(id);
  }

  async getChapters(bookId: string): Promise<BookChapterEntity[]> {
    await this._requireBook(bookId);
    return this.chapters.find({
      where: { bookId },
      select: ['id', 'bookId', 'chapterIndex', 'title', 'wordCount', 'createdAt'],
      order: { chapterIndex: 'ASC' },
    });
  }

  async getChapter(bookId: string, chapterIndex: number): Promise<BookChapterEntity> {
    await this._requireBook(bookId);
    const chapter = await this.chapters.findOne({ where: { bookId, chapterIndex } });
    if (!chapter) throw new NotFoundException('chapter_not_found');
    return chapter;
  }

  async search(dto: SearchBooksDto): Promise<BookEntity[]> {
    // TODO W10: replace ILIKE with pg_trgm + GIN index for better CJK/fuzzy performance
    const like = `%${dto.q.trim()}%`;
    let qb = this.books
      .createQueryBuilder('book')
      .where('book.isPublished = :pub', { pub: true })
      .andWhere('(book.title ILIKE :q OR book.author ILIKE :q)', { q: like });

    if (dto.language) qb = qb.andWhere('book.language = :lang', { lang: dto.language });
    if (dto.cefrLevel) qb = qb.andWhere('book.cefrLevel = :cefr', { cefr: dto.cefrLevel });

    return qb.orderBy('book.popularity', 'DESC').take(50).getMany();
  }

  /**
   * W2 algorithm prototype — basic content-based filtering.
   * Finds books matching user's englishLevel + recently read genres.
   * Full collaborative-filtering version planned for Phase 2 W7-W8.
   */
  async recommend(userId: string, limit = 10): Promise<BookEntity[]> {
    void userId; // Phase 2 will use reading history
    return this.books.find({
      where: { isPublished: true },
      order: { popularity: 'DESC' },
      take: Math.min(limit, 50),
    });
  }

  async rate(userId: string, bookId: string, dto: RateBookDto): Promise<BookRatingEntity> {
    const book = await this.books.findOne({ where: { id: bookId } });
    if (!book) throw new NotFoundException('book_not_found');

    const existing = await this.ratings.findOne({ where: { userId, bookId } });
    if (existing) {
      existing.rating = dto.rating;
      existing.comment = dto.comment ?? null;
      const saved = await this.ratings.save(existing);
      await this._recalcRating(book);
      return saved;
    }

    const row = this.ratings.create({ userId, bookId, rating: dto.rating, comment: dto.comment ?? null });
    const saved = await this.ratings.save(row);
    await this._recalcRating(book);
    return saved;
  }

  async getRatings(bookId: string): Promise<BookRatingEntity[]> {
    await this._requireBook(bookId);
    return this.ratings.find({
      where: { bookId },
      order: { createdAt: 'DESC' },
    });
  }

  private async _requireBook(bookId: string): Promise<BookEntity> {
    const book = await this.books.findOne({ where: { id: bookId } });
    if (!book) throw new NotFoundException('book_not_found');
    return book;
  }

  private async _recalcRating(book: BookEntity): Promise<void> {
    const result = await this.ratings
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .addSelect('COUNT(r.id)', 'cnt')
      .where('r.bookId = :id', { id: book.id })
      .getRawOne<{ avg: string; cnt: string }>();

    book.avgRating = result ? parseFloat(result.avg ?? '0') : 0;
    book.ratingsCount = result ? parseInt(result.cnt ?? '0', 10) : 0;
    await this.books.save(book);
  }
}
