/**
 * Book domain model — aligned with server-cn /api/v1/books schema (W3 backend).
 *
 * 与 server-cn `apps/server-cn/src/modules/books/dto` 中字段保持兼容；上层 UI
 * 仅依赖此处的 ArkTS interface，禁止直接 import server-side type。
 */

export type BookStatus = 'want-to-read' | 'reading' | 'finished';
export type SortBy = 'recent' | 'lastRead' | 'title' | 'rating';

export interface Book {
  id: string;
  slug: string;
  title: string;
  author: string;
  authorZh?: string;
  coverUrl?: string;
  coverThumbUrl?: string;
  description?: string;
  language: string;
  cefrLevel?: string;
  difficulty?: number;
  category?: string;
  wordCount?: number;
  publishYear?: number;
  source?: string;
  goodreadsRating?: number;
  doubanRating?: number;
  genres?: string[];
  hasAudiobook?: boolean;
  audiobookId?: string;
}

export interface BookDetail extends Book {
  estimatedReadTime?: number;
  totalChapters: number;
  tags?: string[];
}

export interface BookFilters {
  page?: number;
  limit?: number;
  language?: string;
  cefrLevel?: string;
  category?: string;
  search?: string;
  sortBy?: SortBy;
}

export interface BookListResponse {
  items: Book[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface UserBook {
  bookId: string;
  book: Book;
  status: BookStatus;
  addedAt: string;
  lastReadAt?: string;
  progress: number;
  currentChapterIndex?: number;
}

export interface Rating {
  id: string;
  userId: string;
  userName?: string;
  rating: number;
  comment?: string;
  createdAt: string;
}
