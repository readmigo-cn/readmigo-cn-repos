import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BookshelfItemEntity, type ShelfStatus } from './entities/bookshelf-item.entity.js';

@Injectable()
export class BookshelfService {
  constructor(
    @InjectRepository(BookshelfItemEntity) private readonly shelf: Repository<BookshelfItemEntity>,
  ) {}

  list(userId: string): Promise<BookshelfItemEntity[]> {
    return this.shelf.find({ where: { userId }, order: { addedAt: 'DESC' } });
  }

  async add(userId: string, bookId: string): Promise<BookshelfItemEntity> {
    const exists = await this.shelf.findOne({ where: { userId, bookId } });
    if (exists) throw new ConflictException('already_on_shelf');
    return this.shelf.save(this.shelf.create({ userId, bookId, status: 'reading' }));
  }

  async remove(userId: string, bookId: string): Promise<void> {
    const r = await this.shelf.delete({ userId, bookId });
    if (!r.affected) throw new NotFoundException('not_on_shelf');
  }

  async updateStatus(userId: string, bookId: string, status: ShelfStatus): Promise<BookshelfItemEntity> {
    const item = await this.shelf.findOne({ where: { userId, bookId } });
    if (!item) throw new NotFoundException('not_on_shelf');
    item.status = status;
    return this.shelf.save(item);
  }
}
