import { HttpClient } from '../HttpClient';

export interface BookSummary {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  language: string;
  cefrLevel?: string;
}

export interface BookDetail extends BookSummary {
  description: string;
  totalChapters: number;
  source: string;
}

export class BooksApi {
  static list(page: number = 1, pageSize: number = 20): Promise<BookSummary[]> {
    return HttpClient.get<BookSummary[]>('/books', { page, pageSize });
  }

  static get(id: string): Promise<BookDetail> {
    return HttpClient.get<BookDetail>(`/books/${id}`);
  }

  static search(keyword: string): Promise<BookSummary[]> {
    return HttpClient.get<BookSummary[]>('/books/search', { q: keyword });
  }
}
