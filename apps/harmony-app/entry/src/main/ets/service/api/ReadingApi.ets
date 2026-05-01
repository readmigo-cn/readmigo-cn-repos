import { HttpClient } from '../HttpClient';
import { ReadingProgress } from '../../store/ReadingStore';

export class ReadingApi {
  static getProgress(bookId: string): Promise<ReadingProgress> {
    return HttpClient.get<ReadingProgress>(`/reading/progress/${bookId}`);
  }

  static updateProgress(p: ReadingProgress): Promise<void> {
    return HttpClient.post<void>('/reading/progress', p);
  }

  static listShelf(): Promise<string[]> {
    return HttpClient.get<string[]>('/bookshelf');
  }

  static addToShelf(bookId: string): Promise<void> {
    return HttpClient.post<void>('/bookshelf', { bookId });
  }
}
