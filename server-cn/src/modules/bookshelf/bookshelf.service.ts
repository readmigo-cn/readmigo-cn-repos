import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BookshelfItemEntity, type ShelfStatus } from './entities/bookshelf-item.entity.js';
import type { ListBookshelfDto } from './dto/bookshelf.dto.js';

@Injectable()
export class BookshelfService {
  constructor(
    @InjectRepository(BookshelfItemEntity) private readonly shelf: Repository<BookshelfItemEntity>,
  ) {}

  list(userId: string, dto?: ListBookshelfDto): Promise<BookshelfItemEntity[]> {
    const where: Record<string, unknown> = { userId };
    if (dto?.status) where['status'] = dto.status;
    if (dto?.favorites) where['isFavorite'] = true;
    return this.shelf.find({ where, order: { addedAt: 'DESC' } });
  }

  async add(userId: string, bookId: string): Promise<BookshelfItemEntity> {
    const exists = await this.shelf.findOne({ where: { userId, bookId } });
    if (exists) throw new ConflictException('already_on_shelf');
    return this.shelf.save(
      this.shelf.create({ userId, bookId, status: 'want-to-read' }),
    );
  }

  async updateStatus(userId: string, bookId: string, status: ShelfStatus): Promise<BookshelfItemEntity> {
    const item = await this._requireItem(userId, bookId);
    item.status = status;
    if (status === 'finished' && !item.finishedAt) {
      item.finishedAt = new Date();
    }
    if (status === 'reading') {
      item.lastReadAt = new Date();
    }
    return this.shelf.save(item);
  }

  async toggleFavorite(userId: string, bookId: string): Promise<BookshelfItemEntity> {
    const item = await this._requireItem(userId, bookId);
    item.isFavorite = !item.isFavorite;
    return this.shelf.save(item);
  }

  async remove(userId: string, bookId: string): Promise<void> {
    const r = await this.shelf.delete({ userId, bookId });
    if (!r.affected) throw new NotFoundException('not_on_shelf');
  }

  private async _requireItem(userId: string, bookId: string): Promise<BookshelfItemEntity> {
    const item = await this.shelf.findOne({ where: { userId, bookId } });
    if (!item) throw new NotFoundException('not_on_shelf');
    return item;
  }
}
