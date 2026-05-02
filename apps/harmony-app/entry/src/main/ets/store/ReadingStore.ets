import { StoreKeys } from './StoreKeys';
import { PreferencesManager } from '../persistence/PreferencesManager';

export interface ReadingProgress {
  bookId: string;
  chapterId: string;
  position: number;
  percent: number;
  updatedAt: number;
}

export interface CurrentBook {
  bookId: string;
  slug: string;
  title: string;
  coverUrl: string;
}

export interface RecentBookEntry {
  bookId: string;
  visitedAt: number;
}

const MAX_RECENT = 10;

/**
 * ReadingStore：当前在读 + 进度 + 最近 10 本。
 *
 * 存储分层：
 *   AppStorage 持运行时引用，UI 用 @StorageLink 监听。
 *   PreferencesManager 持久化（JSON 序列化字符串），重启回灌。
 *
 * 兼容旧 API：setCurrentBook(bookId), setLastProgress, getLastProgress 保留。
 */
export class ReadingStore {
  static async init(): Promise<void> {
    const bookId = await PreferencesManager.getString(StoreKeys.READING_CURRENT_BOOK, '');
    const slug = await PreferencesManager.getString(StoreKeys.READING_CURRENT_SLUG, '');
    const title = await PreferencesManager.getString(StoreKeys.READING_CURRENT_TITLE, '');
    const cover = await PreferencesManager.getString(StoreKeys.READING_CURRENT_COVER, '');
    const progressRaw = await PreferencesManager.getString(StoreKeys.READING_LAST_PROGRESS, '');
    const sessionId = await PreferencesManager.getString(StoreKeys.READING_SESSION_ID, '');
    const recentRaw = await PreferencesManager.getString(StoreKeys.READING_RECENT_BOOKS, '');

    AppStorage.SetOrCreate<string>(StoreKeys.READING_CURRENT_BOOK, bookId);
    AppStorage.SetOrCreate<string>(StoreKeys.READING_CURRENT_SLUG, slug);
    AppStorage.SetOrCreate<string>(StoreKeys.READING_CURRENT_TITLE, title);
    AppStorage.SetOrCreate<string>(StoreKeys.READING_CURRENT_COVER, cover);
    AppStorage.SetOrCreate<string>(StoreKeys.READING_SESSION_ID, sessionId);

    if (progressRaw.length > 0) {
      try {
        const p = JSON.parse(progressRaw) as ReadingProgress;
        AppStorage.SetOrCreate<ReadingProgress>(StoreKeys.READING_LAST_PROGRESS, p);
      } catch (_) {
        // ignore corrupt blob
      }
    }
    if (recentRaw.length > 0) {
      try {
        const list = JSON.parse(recentRaw) as RecentBookEntry[];
        AppStorage.SetOrCreate<RecentBookEntry[]>(StoreKeys.READING_RECENT_BOOKS, list);
      } catch (_) {
        AppStorage.SetOrCreate<RecentBookEntry[]>(StoreKeys.READING_RECENT_BOOKS, []);
      }
    } else {
      AppStorage.SetOrCreate<RecentBookEntry[]>(StoreKeys.READING_RECENT_BOOKS, []);
    }
  }

  /**
   * 兼容旧签名：setCurrentBook(bookId)；新签名带 slug/title/cover。
   * 调用方可只传 bookId（onboarding 兼容），或传完整对象。
   */
  static setCurrentBook(bookId: string, slug: string = '', title: string = '', coverUrl: string = ''): void {
    AppStorage.SetOrCreate<string>(StoreKeys.READING_CURRENT_BOOK, bookId);
    AppStorage.SetOrCreate<string>(StoreKeys.READING_CURRENT_SLUG, slug);
    AppStorage.SetOrCreate<string>(StoreKeys.READING_CURRENT_TITLE, title);
    AppStorage.SetOrCreate<string>(StoreKeys.READING_CURRENT_COVER, coverUrl);
    PreferencesManager.setString(StoreKeys.READING_CURRENT_BOOK, bookId);
    PreferencesManager.setString(StoreKeys.READING_CURRENT_SLUG, slug);
    PreferencesManager.setString(StoreKeys.READING_CURRENT_TITLE, title);
    PreferencesManager.setString(StoreKeys.READING_CURRENT_COVER, coverUrl);
    ReadingStore.addToRecent(bookId);
  }

  static getCurrentBook(): string | undefined {
    return AppStorage.Get<string>(StoreKeys.READING_CURRENT_BOOK);
  }

  static getCurrentBookFull(): CurrentBook | undefined {
    const bookId = AppStorage.Get<string>(StoreKeys.READING_CURRENT_BOOK) ?? '';
    if (!bookId) return undefined;
    return {
      bookId,
      slug: AppStorage.Get<string>(StoreKeys.READING_CURRENT_SLUG) ?? '',
      title: AppStorage.Get<string>(StoreKeys.READING_CURRENT_TITLE) ?? '',
      coverUrl: AppStorage.Get<string>(StoreKeys.READING_CURRENT_COVER) ?? '',
    };
  }

  /** 兼容旧 API：完整覆盖。 */
  static setLastProgress(p: ReadingProgress): void {
    AppStorage.SetOrCreate<ReadingProgress>(StoreKeys.READING_LAST_PROGRESS, p);
    PreferencesManager.setString(StoreKeys.READING_LAST_PROGRESS, JSON.stringify(p));
  }

  static getLastProgress(): ReadingProgress | undefined {
    return AppStorage.Get<ReadingProgress>(StoreKeys.READING_LAST_PROGRESS);
  }

  /**
   * 增量更新当前进度。bookId 取自 currentBook（若无则忽略）。
   */
  static updateProgress(chapterIndex: number, percent: number, scrollOffset: number): void {
    const bookId = AppStorage.Get<string>(StoreKeys.READING_CURRENT_BOOK) ?? '';
    if (!bookId) return;
    const next: ReadingProgress = {
      bookId,
      chapterId: chapterIndex.toString(),
      position: scrollOffset,
      percent,
      updatedAt: Date.now(),
    };
    ReadingStore.setLastProgress(next);
  }

  static startSession(sessionId: string): void {
    AppStorage.SetOrCreate<string>(StoreKeys.READING_SESSION_ID, sessionId);
    PreferencesManager.setString(StoreKeys.READING_SESSION_ID, sessionId);
  }

  static getSessionId(): string {
    return AppStorage.Get<string>(StoreKeys.READING_SESSION_ID) ?? '';
  }

  static endSession(): void {
    AppStorage.SetOrCreate<string>(StoreKeys.READING_SESSION_ID, '');
    PreferencesManager.setString(StoreKeys.READING_SESSION_ID, '');
  }

  static addToRecent(bookId: string): void {
    if (!bookId) return;
    const cur = AppStorage.Get<RecentBookEntry[]>(StoreKeys.READING_RECENT_BOOKS) ?? [];
    const filtered = cur.filter((e) => e.bookId !== bookId);
    filtered.unshift({ bookId, visitedAt: Date.now() });
    const trimmed = filtered.slice(0, MAX_RECENT);
    AppStorage.SetOrCreate<RecentBookEntry[]>(StoreKeys.READING_RECENT_BOOKS, trimmed);
    PreferencesManager.setString(StoreKeys.READING_RECENT_BOOKS, JSON.stringify(trimmed));
  }

  static getRecent(): RecentBookEntry[] {
    return AppStorage.Get<RecentBookEntry[]>(StoreKeys.READING_RECENT_BOOKS) ?? [];
  }

  static clear(): void {
    AppStorage.Delete(StoreKeys.READING_CURRENT_BOOK);
    AppStorage.Delete(StoreKeys.READING_CURRENT_SLUG);
    AppStorage.Delete(StoreKeys.READING_CURRENT_TITLE);
    AppStorage.Delete(StoreKeys.READING_CURRENT_COVER);
    AppStorage.Delete(StoreKeys.READING_LAST_PROGRESS);
    AppStorage.Delete(StoreKeys.READING_SESSION_ID);
    AppStorage.SetOrCreate<RecentBookEntry[]>(StoreKeys.READING_RECENT_BOOKS, []);
    PreferencesManager.remove(StoreKeys.READING_CURRENT_BOOK);
    PreferencesManager.remove(StoreKeys.READING_CURRENT_SLUG);
    PreferencesManager.remove(StoreKeys.READING_CURRENT_TITLE);
    PreferencesManager.remove(StoreKeys.READING_CURRENT_COVER);
    PreferencesManager.remove(StoreKeys.READING_LAST_PROGRESS);
    PreferencesManager.remove(StoreKeys.READING_SESSION_ID);
    PreferencesManager.remove(StoreKeys.READING_RECENT_BOOKS);
  }
}
