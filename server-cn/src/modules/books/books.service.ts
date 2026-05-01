import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';

import { BookEntity } from './entities/book.entity.js';

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(BookEntity) private readonly books: Repository<BookEntity>,
  ) {}

  async list(page: number, pageSize: number, language?: string): Promise<BookEntity[]> {
    return this.books.find({
      where: { isPublished: true, ...(language ? { language } : {}) },
      order: { createdAt: 'DESC' },
      skip: Math.max(0, (page - 1) * pageSize),
      take: Math.min(100, pageSize),
    });
  }

  async findOne(id: string): Promise<BookEntity> {
    const book = await this.books.findOne({ where: { id } });
    if (!book) throw new NotFoundException('book_not_found');
    return book;
  }

  async search(keyword: string): Promise<BookEntity[]> {
    if (!keyword) return [];
    const q = `%${keyword.trim()}%`;
    return this.books.find({
      where: [
        { title: ILike(q), isPublished: true },
        { author: ILike(q), isPublished: true },
      ],
      take: 50,
    });
  }
}
