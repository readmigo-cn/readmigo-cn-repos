import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ReadingProgressEntity } from './entities/reading-progress.entity.js';

@Injectable()
export class ReadingService {
  constructor(
    @InjectRepository(ReadingProgressEntity) private readonly progress: Repository<ReadingProgressEntity>,
  ) {}

  async getProgress(userId: string, bookId: string): Promise<ReadingProgressEntity | null> {
    return this.progress.findOne({ where: { userId, bookId } });
  }

  async upsertProgress(
    userId: string,
    bookId: string,
    chapterId: string | null,
    position: number,
    percent: number,
  ): Promise<ReadingProgressEntity> {
    let row = await this.progress.findOne({ where: { userId, bookId } });
    if (!row) {
      row = this.progress.create({ userId, bookId, chapterId, position, percent });
    } else {
      row.chapterId = chapterId;
      row.position = position;
      row.percent = percent;
    }
    return this.progress.save(row);
  }
}
