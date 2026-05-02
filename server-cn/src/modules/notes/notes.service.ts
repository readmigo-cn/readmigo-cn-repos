import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, LessThanOrEqual, Repository } from 'typeorm';

import { CreatePersonalNoteDto } from './dto/create-personal-note.dto.js';
import { CreateVocabNoteDto } from './dto/create-vocab-note.dto.js';
import { GetDueVocabDto } from './dto/get-due-vocab.dto.js';
import { ListPersonalNotesDto } from './dto/list-personal-notes.dto.js';
import { ListVocabNotesDto } from './dto/list-vocab-notes.dto.js';
import { ReviewVocabDto } from './dto/review-vocab.dto.js';
import { SearchVocabNotesDto } from './dto/search-vocab-notes.dto.js';
import { UpdatePersonalNoteDto } from './dto/update-personal-note.dto.js';
import { UpdateVocabNoteDto } from './dto/update-vocab-note.dto.js';
import { PersonalNoteEntity } from './entities/personal-note.entity.js';
import { VocabNoteEntity } from './entities/vocab-note.entity.js';
import { VocabReviewLogEntity } from './entities/vocab-review-log.entity.js';

// ─────────────────────────────────────────────────────────────────────────────
// SM-2 算法实现（SuperMemo-2，艾宾浩斯遗忘曲线调度）
//
// 核心公式：
//   新 EF = EF + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)
//   其中 EF 不得低于 1.3
//
// 区间规则：
//   q < 3（未通过）：interval = 1，重置为明天再复习
//   q >= 3（通过）：
//     第 1 次通过：interval = 1
//     第 2 次通过：interval = 6
//     此后：      interval = round(prevInterval * EF)
// ─────────────────────────────────────────────────────────────────────────────

const SM2_MIN_EF = 1.3;

interface Sm2Result {
  newInterval: number;
  newEasinessFactor: number;
  /** true = 本次成功记住（q >= 3），false = 遗忘需重置 */
  passed: boolean;
}

function applySm2(quality: number, reviewCount: number, interval: number, easinessFactor: number): Sm2Result {
  // 新 EF 公式
  const newEF = Math.max(
    SM2_MIN_EF,
    easinessFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02),
  );

  if (quality < 3) {
    // 遗忘：重置间隔，降低 EF
    return { newInterval: 1, newEasinessFactor: Math.max(SM2_MIN_EF, easinessFactor - 0.2), passed: false };
  }

  // 通过：按复习次数计算新区间
  let newInterval: number;
  if (reviewCount === 0) {
    // 第一次通过
    newInterval = 1;
  } else if (reviewCount === 1) {
    // 第二次通过
    newInterval = 6;
  } else {
    // 此后根据 EF 指数增长
    newInterval = Math.round(interval * newEF);
  }

  return { newInterval, newEasinessFactor: newEF, passed: true };
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(VocabNoteEntity)
    private readonly vocabNotes: Repository<VocabNoteEntity>,
    @InjectRepository(VocabReviewLogEntity)
    private readonly reviewLogs: Repository<VocabReviewLogEntity>,
    @InjectRepository(PersonalNoteEntity)
    private readonly personalNotes: Repository<PersonalNoteEntity>,
  ) {}

  // ── VocabNote CRUD ──────────────────────────────────────────────────────────

  async listVocabNotes(
    userId: string,
    filter: ListVocabNotesDto,
  ): Promise<{ items: VocabNoteEntity[]; total: number }> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 50;
    const now = new Date();

    const qb = this.vocabNotes
      .createQueryBuilder('v')
      .where('v.userId = :userId', { userId });

    if (filter.sourceBookId) {
      qb.andWhere('v.sourceBookId = :sourceBookId', { sourceBookId: filter.sourceBookId });
    }
    if (filter.userTag) {
      qb.andWhere('v.userTag = :userTag', { userTag: filter.userTag });
    }
    if (filter.dueOnly) {
      qb.andWhere('v.nextReviewAt <= :now', { now });
    }

    const [items, total] = await qb
      .orderBy('v.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total };
  }

  async searchVocabNotes(userId: string, dto: SearchVocabNotesDto): Promise<VocabNoteEntity[]> {
    const pattern = `%${dto.q}%`;
    return this.vocabNotes
      .createQueryBuilder('v')
      .where('v.userId = :userId', { userId })
      .andWhere('(v.word ILIKE :pattern OR v.lemma ILIKE :pattern)', { pattern })
      .orderBy('v.word', 'ASC')
      .take(dto.limit ?? 20)
      .getMany();
  }

  async getVocabNote(userId: string, id: string): Promise<VocabNoteEntity> {
    const note = await this.vocabNotes.findOne({ where: { id, userId } });
    if (!note) throw new NotFoundException('vocab_note_not_found');
    return note;
  }

  async createVocabNote(userId: string, dto: CreateVocabNoteDto): Promise<VocabNoteEntity> {
    const entity = this.vocabNotes.create({
      userId,
      word: dto.word,
      lemma: dto.lemma ?? null,
      pronunciation: dto.pronunciation ?? null,
      definition: dto.definition ?? null,
      exampleSentence: dto.exampleSentence ?? null,
      sourceBookId: dto.sourceBookId ?? null,
      sourceChapterIndex: dto.sourceChapterIndex ?? null,
      sourceParagraphIndex: dto.sourceParagraphIndex ?? null,
      sourceContext: dto.sourceContext ?? null,
      userTag: dto.userTag ?? null,
      aiTags: dto.aiTags ?? null,
      partOfSpeech: dto.partOfSpeech ?? null,
      difficulty: dto.difficulty ?? 3,
      // SM-2 初始值
      easinessFactor: 2.5,
      interval: 0,
      reviewCount: 0,
      nextReviewAt: null,
      lastReviewedAt: null,
    });
    return this.vocabNotes.save(entity);
  }

  async updateVocabNote(userId: string, id: string, dto: UpdateVocabNoteDto): Promise<VocabNoteEntity> {
    const note = await this.getVocabNote(userId, id);
    Object.assign(note, dto);
    return this.vocabNotes.save(note);
  }

  async deleteVocabNote(userId: string, id: string): Promise<void> {
    const result = await this.vocabNotes.delete({ id, userId });
    if (!result.affected) throw new NotFoundException('vocab_note_not_found');
  }

  // ── SRS (SuperMemo-2) ───────────────────────────────────────────────────────

  async getDueForReview(userId: string, options: GetDueVocabDto): Promise<VocabNoteEntity[]> {
    const now = new Date();
    const count = options.count ?? 20;

    const qb = this.vocabNotes
      .createQueryBuilder('v')
      .where('v.userId = :userId', { userId })
      .andWhere('v.nextReviewAt <= :now', { now });

    if (options.sourceBookId) {
      qb.andWhere('v.sourceBookId = :sourceBookId', { sourceBookId: options.sourceBookId });
    }
    if (options.userTag) {
      qb.andWhere('v.userTag = :userTag', { userTag: options.userTag });
    }

    return qb
      // 优先返回逾期时间最长的（最急需复习）
      .orderBy('v.nextReviewAt', 'ASC')
      .take(count)
      .getMany();
  }

  async submitReview(userId: string, dto: ReviewVocabDto): Promise<VocabNoteEntity> {
    const note = await this.getVocabNote(userId, dto.vocabNoteId);

    const priorEasiness = note.easinessFactor;
    const priorInterval = note.interval;

    // 应用 SM-2 算法
    const { newInterval, newEasinessFactor, passed } = applySm2(
      dto.quality,
      note.reviewCount,
      note.interval,
      note.easinessFactor,
    );

    const now = new Date();
    note.easinessFactor = newEasinessFactor;
    note.interval = newInterval;
    note.lastReviewedAt = now;
    note.nextReviewAt = addDays(now, newInterval);
    // 只有通过（q >= 3）才增加 reviewCount，这样下次还能走正确的区间分支
    if (passed) {
      note.reviewCount += 1;
    }

    await this.vocabNotes.save(note);

    // 记录复习日志
    const response = dto.quality === 0 ? 'skipped' : passed ? 'correct' : 'incorrect';
    const log = this.reviewLogs.create({
      userId,
      vocabNoteId: note.id,
      reviewedAt: now,
      quality: dto.quality,
      priorEasiness,
      newEasiness: newEasinessFactor,
      priorInterval,
      newInterval,
      response,
    });
    await this.reviewLogs.save(log);

    return note;
  }

  async getReviewStats(
    userId: string,
    period: 'today' | '7d' | '30d' = '7d',
  ): Promise<{
    totalReviews: number;
    correctCount: number;
    incorrectCount: number;
    accuracy: number;
    dueToday: number;
  }> {
    const now = new Date();
    const sinceMap: Record<string, Date> = {
      today: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    };
    const since = sinceMap[period] ?? sinceMap['7d'];

    const logs = await this.reviewLogs
      .createQueryBuilder('l')
      .where('l.userId = :userId', { userId })
      .andWhere('l.reviewedAt >= :since', { since })
      .select(['l.response'])
      .getMany();

    const totalReviews = logs.length;
    const correctCount = logs.filter((l) => l.response === 'correct').length;
    const incorrectCount = logs.filter((l) => l.response === 'incorrect').length;
    const accuracy = totalReviews > 0 ? Math.round((correctCount / totalReviews) * 100) : 0;

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const dueToday = await this.vocabNotes.count({
      where: {
        userId,
        nextReviewAt: LessThanOrEqual(todayEnd),
      },
    });

    return { totalReviews, correctCount, incorrectCount, accuracy, dueToday };
  }

  // ── PersonalNote CRUD ───────────────────────────────────────────────────────

  async listPersonalNotes(
    userId: string,
    filter: ListPersonalNotesDto,
  ): Promise<{ items: PersonalNoteEntity[]; total: number }> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 50;

    const qb = this.personalNotes
      .createQueryBuilder('p')
      .where('p.userId = :userId', { userId });

    if (filter.bookId) {
      qb.andWhere('p.bookId = :bookId', { bookId: filter.bookId });
    }
    if (filter.tag) {
      // simple-array 存储格式为逗号分隔字符串，使用 LIKE 匹配
      qb.andWhere("p.tags LIKE :tag", { tag: `%${filter.tag}%` });
    }

    const [items, total] = await qb
      .orderBy('p.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total };
  }

  async createPersonalNote(userId: string, dto: CreatePersonalNoteDto): Promise<PersonalNoteEntity> {
    const entity = this.personalNotes.create({
      userId,
      bookId: dto.bookId ?? null,
      chapterIndex: dto.chapterIndex ?? null,
      content: dto.content,
      tags: dto.tags ?? null,
      isPublic: dto.isPublic ?? false,
    });
    return this.personalNotes.save(entity);
  }

  async getPersonalNote(userId: string, id: string): Promise<PersonalNoteEntity> {
    const note = await this.personalNotes.findOne({ where: { id, userId } });
    if (!note) throw new NotFoundException('personal_note_not_found');
    return note;
  }

  async updatePersonalNote(
    userId: string,
    id: string,
    dto: UpdatePersonalNoteDto,
  ): Promise<PersonalNoteEntity> {
    const note = await this.getPersonalNote(userId, id);
    Object.assign(note, dto);
    return this.personalNotes.save(note);
  }

  async deletePersonalNote(userId: string, id: string): Promise<void> {
    const result = await this.personalNotes.delete({ id, userId });
    if (!result.affected) throw new NotFoundException('personal_note_not_found');
  }

  async getPersonalNotesForBook(userId: string, bookId: string): Promise<PersonalNoteEntity[]> {
    return this.personalNotes.find({
      where: { userId, bookId },
      order: { chapterIndex: 'ASC', createdAt: 'ASC' },
    });
  }
}
