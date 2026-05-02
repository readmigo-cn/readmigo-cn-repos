import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';

import { ReadingProgressEntity } from '../reading/entities/reading-progress.entity.js';
import { VocabNoteEntity } from '../notes/entities/vocab-note.entity.js';

// ─── Daily word pool ──────────────────────────────────────────────────────────

interface DailyWord {
  word: string;
  partOfSpeech: string;
  definition: string;
  exampleEn: string;
  exampleZh: string;
  date: string;
}

const POOL: Omit<DailyWord, 'date'>[] = [
  { word: 'serendipity', partOfSpeech: 'noun', definition: '美好的偶然；意外发现珍宝的能力', exampleEn: 'Finding this little café was pure serendipity.', exampleZh: '发现这家小咖啡馆完全是美好的偶然。' },
  { word: 'ephemeral', partOfSpeech: 'adj', definition: '短暂的；昙花一现的', exampleEn: 'The ephemeral beauty of cherry blossoms.', exampleZh: '樱花转瞬即逝的美。' },
  { word: 'resilient', partOfSpeech: 'adj', definition: '有韧性的；能快速恢复的', exampleEn: 'Children are remarkably resilient.', exampleZh: '孩子们的恢复能力惊人。' },
  { word: 'eloquent', partOfSpeech: 'adj', definition: '雄辩的；有说服力的', exampleEn: 'Her eloquent speech moved the audience.', exampleZh: '她雄辩的演讲打动了听众。' },
  { word: 'meticulous', partOfSpeech: 'adj', definition: '一丝不苟的；极其细致的', exampleEn: 'He is meticulous about every detail.', exampleZh: '他对每个细节都一丝不苟。' },
  { word: 'profound', partOfSpeech: 'adj', definition: '深刻的；意义深远的', exampleEn: 'A profound thought worth pondering.', exampleZh: '一个值得深思的深刻想法。' },
  { word: 'tranquil', partOfSpeech: 'adj', definition: '宁静的；平和的', exampleEn: 'The tranquil lake at dawn.', exampleZh: '黎明时分宁静的湖面。' },
  { word: 'audacious', partOfSpeech: 'adj', definition: '大胆的；无畏的', exampleEn: 'An audacious plan to climb the peak.', exampleZh: '一个大胆的登顶计划。' },
  { word: 'whimsical', partOfSpeech: 'adj', definition: '异想天开的；古怪可爱的', exampleEn: 'A whimsical drawing on the wall.', exampleZh: '墙上一幅古怪可爱的画。' },
  { word: 'pristine', partOfSpeech: 'adj', definition: '原始的；未受破坏的', exampleEn: 'A pristine forest untouched by humans.', exampleZh: '一片未被人类触碰的原始森林。' },
];

// ─── AI tips (7-day rotation) ─────────────────────────────────────────────────

const AI_TIPS: string[] = [
  '每天坚持阅读 15 分钟，一年可以读完 12 本书。',
  '遇到不认识的单词，先猜测语境含义，再查词典，记忆效果更好。',
  '读完一章后，尝试用自己的话概括主要内容，加深理解。',
  '有声书和电子书搭配使用，通勤时听，睡前读，利用碎片时间。',
  '记读书笔记不必完整，几个关键词或一句感悟就足够。',
  '把书中的金句分享给朋友，讲述是最好的复习方式。',
  '读书时关掉通知，专注 25 分钟（番茄工作法），效率提升 40%。',
];

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class WidgetService {
  constructor(
    @InjectRepository(VocabNoteEntity)
    private readonly vocabRepo: Repository<VocabNoteEntity>,
    @InjectRepository(ReadingProgressEntity)
    private readonly progressRepo: Repository<ReadingProgressEntity>,
  ) {}

  // ── Daily word ────────────────────────────────────────────────────────────

  /**
   * Returns a vocab note due for review today if one exists,
   * otherwise falls back to the pool-based word-of-the-day.
   */
  async getDailyWord(userId: string): Promise<DailyWord & { fromVocab?: boolean; vocabId?: string }> {
    const today = new Date().toISOString().slice(0, 10);
    const endOfDay = new Date(`${today}T23:59:59.999Z`);

    const dueNote = await this.vocabRepo.findOne({
      where: { userId, nextReviewAt: LessThanOrEqual(endOfDay) },
      order: { nextReviewAt: 'ASC' },
    });

    if (dueNote) {
      return {
        word: dueNote.word,
        partOfSpeech: dueNote.partOfSpeech ?? '',
        definition: dueNote.definition ?? '',
        exampleEn: dueNote.exampleSentence ?? '',
        exampleZh: '',
        date: today,
        fromVocab: true,
        vocabId: dueNote.id,
      };
    }

    // Fallback: deterministic pool selection by date
    const idx = today.split('-').reduce((a, s) => a + parseInt(s, 10), 0) % POOL.length;
    return { ...POOL[idx], date: today, fromVocab: false };
  }

  // ── Reading progress ──────────────────────────────────────────────────────

  /** Returns the most-recently-read book's progress for the given user. */
  async getReadingProgress(userId: string): Promise<{
    bookId: string | null;
    percentComplete: number;
    currentChapterIndex: number;
    totalReadMinutes: number;
    lastReadAt: Date | null;
  }> {
    const progress = await this.progressRepo.findOne({
      where: { userId },
      order: { lastReadAt: 'DESC' },
    });

    if (!progress) {
      return { bookId: null, percentComplete: 0, currentChapterIndex: 0, totalReadMinutes: 0, lastReadAt: null };
    }

    return {
      bookId: progress.bookId,
      percentComplete: progress.percentComplete,
      currentChapterIndex: progress.currentChapterIndex,
      totalReadMinutes: progress.totalReadMinutes,
      lastReadAt: progress.lastReadAt,
    };
  }

  // ── AI tip ────────────────────────────────────────────────────────────────

  /** Returns one of 7 rotating tips by day-of-week (deterministic, no DB). */
  getAiTip(_userId: string): { tip: string; day: number } {
    const day = new Date().getDay(); // 0 (Sun) – 6 (Sat)
    return { tip: AI_TIPS[day], day };
  }

  // ── Legacy (no-auth daily-word, kept for existing Android widget) ─────────
  getDailyWordLegacy(): DailyWord {
    const today = new Date().toISOString().slice(0, 10);
    const idx = today.split('-').reduce((a, s) => a + parseInt(s, 10), 0) % POOL.length;
    return { ...POOL[idx], date: today };
  }
}
