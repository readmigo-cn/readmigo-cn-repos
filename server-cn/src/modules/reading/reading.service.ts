import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ReadingHighlightEntity } from './entities/reading-highlight.entity.js';
import { ReadingProgressEntity } from './entities/reading-progress.entity.js';
import { ReadingSessionEntity } from './entities/reading-session.entity.js';
import type { UpdateProgressDto } from './dto/update-progress.dto.js';
import type { SessionEndDto, SessionStartDto } from './dto/session.dto.js';
import type { CreateHighlightDto, ListHighlightsDto, UpdateHighlightDto } from './dto/highlight.dto.js';

export interface ReadingStats {
  totalReadMinutes: number;
  booksFinished: number;
  totalSessions: number;
  avgSessionMinutes: number;
  period: string;
}

@Injectable()
export class ReadingService {
  constructor(
    @InjectRepository(ReadingProgressEntity)
    private readonly progress: Repository<ReadingProgressEntity>,
    @InjectRepository(ReadingSessionEntity)
    private readonly sessions: Repository<ReadingSessionEntity>,
    @InjectRepository(ReadingHighlightEntity)
    private readonly highlights: Repository<ReadingHighlightEntity>,
  ) {}

  async getProgress(userId: string, bookId: string): Promise<ReadingProgressEntity | null> {
    return this.progress.findOne({ where: { userId, bookId } });
  }

  async updateProgress(userId: string, bookId: string, dto: UpdateProgressDto): Promise<ReadingProgressEntity> {
    let row = await this.progress.findOne({ where: { userId, bookId } });
    if (!row) {
      row = this.progress.create({ userId, bookId });
    }
    row.currentChapterIndex = dto.currentChapterIndex;
    row.currentParagraphIndex = dto.currentParagraphIndex ?? row.currentParagraphIndex;
    row.scrollOffset = dto.scrollOffset ?? row.scrollOffset;
    row.percentComplete = dto.percentComplete;
    row.lastReadAt = new Date();
    return this.progress.save(row);
  }

  async startSession(userId: string, dto: SessionStartDto): Promise<ReadingSessionEntity> {
    const session = this.sessions.create({ userId, bookId: dto.bookId });
    return this.sessions.save(session);
  }

  async endSession(userId: string, sessionId: string, dto: SessionEndDto): Promise<ReadingSessionEntity> {
    const session = await this.sessions.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('session_not_found');
    if (session.userId !== userId) throw new ForbiddenException('session_not_owned');

    session.endedAt = new Date();
    session.durationSeconds = dto.durationSeconds;
    session.pagesRead = dto.pagesRead ?? 0;
    session.chaptersRead = dto.chaptersRead ?? 0;
    session.wordsLooked = dto.wordsLooked ?? 0;

    const saved = await this.sessions.save(session);

    // Update accumulated reading time on progress row
    await this._updateProgressTime(userId, session.bookId, dto.durationSeconds);

    return saved;
  }

  async listHighlights(userId: string, bookId: string, dto?: ListHighlightsDto): Promise<ReadingHighlightEntity[]> {
    const where: Record<string, unknown> = { userId, bookId };
    if (dto?.chapterIndex !== undefined) where['chapterIndex'] = dto.chapterIndex;
    return this.highlights.find({ where, order: { chapterIndex: 'ASC', startOffset: 'ASC' } });
  }

  async createHighlight(userId: string, dto: CreateHighlightDto): Promise<ReadingHighlightEntity> {
    const row = this.highlights.create({
      userId,
      bookId: dto.bookId,
      chapterIndex: dto.chapterIndex,
      paragraphIndex: dto.paragraphIndex ?? 0,
      startOffset: dto.startOffset ?? 0,
      endOffset: dto.endOffset ?? 0,
      text: dto.text,
      color: dto.color ?? 'yellow',
      note: dto.note ?? null,
    });
    return this.highlights.save(row);
  }

  async updateHighlight(userId: string, id: string, dto: UpdateHighlightDto): Promise<ReadingHighlightEntity> {
    const row = await this.highlights.findOne({ where: { id } });
    if (!row) throw new NotFoundException('highlight_not_found');
    if (row.userId !== userId) throw new ForbiddenException('highlight_not_owned');

    if (dto.color !== undefined) row.color = dto.color;
    if (dto.note !== undefined) row.note = dto.note;
    return this.highlights.save(row);
  }

  async deleteHighlight(userId: string, id: string): Promise<void> {
    const row = await this.highlights.findOne({ where: { id } });
    if (!row) throw new NotFoundException('highlight_not_found');
    if (row.userId !== userId) throw new ForbiddenException('highlight_not_owned');
    await this.highlights.delete(id);
  }

  /**
   * Reading statistics for a user.
   * Full implementation with date-range bucketing planned for Phase 2.
   */
  async getReadingStats(userId: string, period: string): Promise<ReadingStats> {
    const allProgress = await this.progress.find({ where: { userId } });
    const totalReadMinutes = allProgress.reduce(
      (sum: number, p: ReadingProgressEntity) => sum + p.totalReadMinutes,
      0,
    );
    const booksFinished = allProgress.filter(
      (p: ReadingProgressEntity) => p.percentComplete >= 0.99,
    ).length;

    const sessionCount = await this.sessions
      .createQueryBuilder('s')
      .where('s.userId = :uid', { uid: userId })
      .andWhere('s.endedAt IS NOT NULL')
      .getCount();

    const avgSessionMinutes =
      sessionCount > 0 ? Math.round((totalReadMinutes / sessionCount) * 10) / 10 : 0;

    return { totalReadMinutes, booksFinished, totalSessions: sessionCount, avgSessionMinutes, period };
  }

  private async _updateProgressTime(userId: string, bookId: string, durationSeconds: number): Promise<void> {
    let row = await this.progress.findOne({ where: { userId, bookId } });
    if (!row) return;
    row.totalReadMinutes += Math.round(durationSeconds / 60);
    row.sessionsCount += 1;
    row.lastReadAt = new Date();
    await this.progress.save(row);
  }
}
