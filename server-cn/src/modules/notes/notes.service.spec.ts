import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { PersonalNoteEntity } from './entities/personal-note.entity.js';
import { VocabNoteEntity } from './entities/vocab-note.entity.js';
import { VocabReviewLogEntity } from './entities/vocab-review-log.entity.js';
import { NotesService } from './notes.service.js';

// ─── 仿 Repository 工厂 ─────────────────────────────────────────────────────

function makeRepo<T>(overrides: Partial<Repository<T>> = {}): jest.Mocked<Repository<T>> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((dto) => ({ ...dto }) as T),
    save: jest.fn((entity) => Promise.resolve(entity) as Promise<T>),
    delete: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<Repository<T>>;
}

// ─── SM-2 テスト用のベースノード ──────────────────────────────────────────────

function makeVocabNote(overrides: Partial<VocabNoteEntity> = {}): VocabNoteEntity {
  return {
    id: 'note-uuid-1',
    userId: 'user-uuid-1',
    word: 'ephemeral',
    lemma: 'ephemeral',
    pronunciation: null,
    definition: null,
    exampleSentence: null,
    sourceBookId: null,
    sourceChapterIndex: null,
    sourceParagraphIndex: null,
    sourceContext: null,
    userTag: null,
    aiTags: null,
    partOfSpeech: null,
    difficulty: 3,
    nextReviewAt: null,
    lastReviewedAt: null,
    reviewCount: 0,
    easinessFactor: 2.5,
    interval: 0,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

describe('NotesService', () => {
  let service: NotesService;
  let vocabRepo: jest.Mocked<Repository<VocabNoteEntity>>;
  let reviewLogRepo: jest.Mocked<Repository<VocabReviewLogEntity>>;
  let personalNoteRepo: jest.Mocked<Repository<PersonalNoteEntity>>;

  beforeEach(async () => {
    vocabRepo = makeRepo<VocabNoteEntity>();
    reviewLogRepo = makeRepo<VocabReviewLogEntity>();
    personalNoteRepo = makeRepo<PersonalNoteEntity>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotesService,
        { provide: getRepositoryToken(VocabNoteEntity), useValue: vocabRepo },
        { provide: getRepositoryToken(VocabReviewLogEntity), useValue: reviewLogRepo },
        { provide: getRepositoryToken(PersonalNoteEntity), useValue: personalNoteRepo },
      ],
    }).compile();

    service = module.get<NotesService>(NotesService);
  });

  // ── createVocabNote ────────────────────────────────────────────────────────

  it('createVocabNote: 初始化 SM-2 默认值', async () => {
    const note = makeVocabNote();
    vocabRepo.create.mockReturnValue(note);
    vocabRepo.save.mockResolvedValue(note);

    const result = await service.createVocabNote('user-uuid-1', { word: 'ephemeral' });

    expect(vocabRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        easinessFactor: 2.5,
        interval: 0,
        reviewCount: 0,
        nextReviewAt: null,
      }),
    );
    expect(result.word).toBe('ephemeral');
  });

  // ── getVocabNote ───────────────────────────────────────────────────────────

  it('getVocabNote: 不存在时抛出 NotFoundException', async () => {
    vocabRepo.findOne.mockResolvedValue(null);
    await expect(service.getVocabNote('user-uuid-1', 'no-such-id')).rejects.toThrow(NotFoundException);
  });

  // ── submitReview: SM-2 算法验证 ────────────────────────────────────────────

  it('SM-2: quality=0（完全遗忘）→ interval=1，EF 降低，reviewCount 不增加', async () => {
    const note = makeVocabNote({ reviewCount: 2, interval: 10, easinessFactor: 2.5 });
    vocabRepo.findOne.mockResolvedValue(note);
    vocabRepo.save.mockImplementation(async (e) => e as VocabNoteEntity);
    reviewLogRepo.create.mockImplementation((d) => d as VocabReviewLogEntity);
    reviewLogRepo.save.mockResolvedValue({} as VocabReviewLogEntity);

    const result = await service.submitReview('user-uuid-1', { vocabNoteId: 'note-uuid-1', quality: 0 });

    expect(result.interval).toBe(1);
    expect(result.easinessFactor).toBeCloseTo(Math.max(1.3, 2.5 - 0.2), 5);
    expect(result.reviewCount).toBe(2); // 未增加
    expect(result.nextReviewAt).not.toBeNull();
  });

  it('SM-2: quality=2（不通过）→ interval=1，EF 降低，reviewCount 不增加', async () => {
    const note = makeVocabNote({ reviewCount: 3, interval: 6, easinessFactor: 2.3 });
    vocabRepo.findOne.mockResolvedValue(note);
    vocabRepo.save.mockImplementation(async (e) => e as VocabNoteEntity);
    reviewLogRepo.create.mockImplementation((d) => d as VocabReviewLogEntity);
    reviewLogRepo.save.mockResolvedValue({} as VocabReviewLogEntity);

    const result = await service.submitReview('user-uuid-1', { vocabNoteId: 'note-uuid-1', quality: 2 });

    expect(result.interval).toBe(1);
    expect(result.reviewCount).toBe(3);
  });

  it('SM-2: 第一次通过（reviewCount=0, quality=4）→ interval=1，reviewCount=1', async () => {
    const note = makeVocabNote({ reviewCount: 0, interval: 0, easinessFactor: 2.5 });
    vocabRepo.findOne.mockResolvedValue(note);
    vocabRepo.save.mockImplementation(async (e) => e as VocabNoteEntity);
    reviewLogRepo.create.mockImplementation((d) => d as VocabReviewLogEntity);
    reviewLogRepo.save.mockResolvedValue({} as VocabReviewLogEntity);

    const result = await service.submitReview('user-uuid-1', { vocabNoteId: 'note-uuid-1', quality: 4 });

    expect(result.interval).toBe(1);
    expect(result.reviewCount).toBe(1);
  });

  it('SM-2: 第二次通过（reviewCount=1, quality=5）→ interval=6，reviewCount=2', async () => {
    const note = makeVocabNote({ reviewCount: 1, interval: 1, easinessFactor: 2.5 });
    vocabRepo.findOne.mockResolvedValue(note);
    vocabRepo.save.mockImplementation(async (e) => e as VocabNoteEntity);
    reviewLogRepo.create.mockImplementation((d) => d as VocabReviewLogEntity);
    reviewLogRepo.save.mockResolvedValue({} as VocabReviewLogEntity);

    const result = await service.submitReview('user-uuid-1', { vocabNoteId: 'note-uuid-1', quality: 5 });

    expect(result.interval).toBe(6);
    expect(result.reviewCount).toBe(2);
  });

  it('SM-2: 第三次之后（reviewCount=2, quality=4, interval=6, EF=2.5）→ interval=round(6*2.6)=16', async () => {
    // EF after q=4: 2.5 + 0.1 - (5-4)*(0.08 + (5-4)*0.02) = 2.5 + 0.1 - 0.1 = 2.5
    // newInterval = round(6 * 2.5) = 15
    const note = makeVocabNote({ reviewCount: 2, interval: 6, easinessFactor: 2.5 });
    vocabRepo.findOne.mockResolvedValue(note);
    vocabRepo.save.mockImplementation(async (e) => e as VocabNoteEntity);
    reviewLogRepo.create.mockImplementation((d) => d as VocabReviewLogEntity);
    reviewLogRepo.save.mockResolvedValue({} as VocabReviewLogEntity);

    const result = await service.submitReview('user-uuid-1', { vocabNoteId: 'note-uuid-1', quality: 4 });

    expect(result.interval).toBe(15);
    expect(result.reviewCount).toBe(3);
  });

  it('SM-2: EF 不低于 1.3（quality=0 多次后的下界保护）', async () => {
    const note = makeVocabNote({ reviewCount: 5, interval: 1, easinessFactor: 1.3 });
    vocabRepo.findOne.mockResolvedValue(note);
    vocabRepo.save.mockImplementation(async (e) => e as VocabNoteEntity);
    reviewLogRepo.create.mockImplementation((d) => d as VocabReviewLogEntity);
    reviewLogRepo.save.mockResolvedValue({} as VocabReviewLogEntity);

    const result = await service.submitReview('user-uuid-1', { vocabNoteId: 'note-uuid-1', quality: 0 });

    expect(result.easinessFactor).toBeGreaterThanOrEqual(1.3);
  });

  it('SM-2: quality=5（满分）→ EF 提高', async () => {
    const note = makeVocabNote({ reviewCount: 2, interval: 6, easinessFactor: 2.5 });
    vocabRepo.findOne.mockResolvedValue(note);
    vocabRepo.save.mockImplementation(async (e) => e as VocabNoteEntity);
    reviewLogRepo.create.mockImplementation((d) => d as VocabReviewLogEntity);
    reviewLogRepo.save.mockResolvedValue({} as VocabReviewLogEntity);

    const result = await service.submitReview('user-uuid-1', { vocabNoteId: 'note-uuid-1', quality: 5 });

    // EF = 2.5 + 0.1 - 0*(0.08 + 0*0.02) = 2.6
    expect(result.easinessFactor).toBeCloseTo(2.6, 4);
  });

  // ── deleteVocabNote ────────────────────────────────────────────────────────

  it('deleteVocabNote: 不存在时抛出 NotFoundException', async () => {
    vocabRepo.delete.mockResolvedValue({ affected: 0, raw: [] });
    await expect(service.deleteVocabNote('user-uuid-1', 'no-such-id')).rejects.toThrow(NotFoundException);
  });
});
