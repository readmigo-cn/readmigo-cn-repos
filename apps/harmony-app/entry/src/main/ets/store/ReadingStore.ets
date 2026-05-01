import { StoreKeys } from './StoreKeys';

export interface ReadingProgress {
  bookId: string;
  chapterId: string;
  position: number;
  percent: number;
  updatedAt: number;
}

export class ReadingStore {
  static setCurrentBook(bookId: string): void {
    AppStorage.SetOrCreate<string>(StoreKeys.READING_CURRENT_BOOK, bookId);
  }

  static getCurrentBook(): string | undefined {
    return AppStorage.Get<string>(StoreKeys.READING_CURRENT_BOOK);
  }

  static setLastProgress(p: ReadingProgress): void {
    AppStorage.SetOrCreate<ReadingProgress>(StoreKeys.READING_LAST_PROGRESS, p);
  }

  static getLastProgress(): ReadingProgress | undefined {
    return AppStorage.Get<ReadingProgress>(StoreKeys.READING_LAST_PROGRESS);
  }
}
