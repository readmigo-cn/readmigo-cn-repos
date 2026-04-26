/**
 * Book model - aligned with overseas readmigo-repos types
 * 功能对齐：Book entity from web/src/features/library/types/index.ts
 */

export interface Book {
  id: string;
  title: string;
  author: string;
  authorId?: string;
  authorZh?: string;
  coverUrl: string;
  coverThumbUrl?: string;
  description: string;
  language: string;
  difficulty?: number;
  difficultyScore?: number;
  category: string;
  wordCount: number;
  publishYear?: number;
  source?: string;
  goodreadsRating?: number;
  doubanRating?: number;
  genres?: string[];
}

export interface BookDetail extends Book {
  epubUrl: string;
  chapters: Chapter[];
  aiScore?: number;
  estimatedReadTime: number;
  tags: string[];
  hasAudiobook?: boolean;
  audiobookId?: string;
  seriesId?: string;
  seriesName?: string;
  seriesPosition?: number;
  seriesBookCount?: number;
}

export interface Chapter {
  id: string;
  title: string;
  href: string;
  order: number;
  wordCount?: number;
}

export interface UserBook {
  id: string;
  bookId: string;
  book: Book;
  addedAt: Date;
  lastReadAt?: Date;
  progress: number;
  currentCfi?: string;
  status: 'reading' | 'finished' | 'want-to-read';
}

export interface BookListBook {
  id: string;
  title: string;
  author: string;
  authorId?: string;
  description?: string;
  coverUrl?: string;
  coverThumbUrl?: string;
  difficultyScore?: number;
  wordCount?: number;
  genres?: string[];
  doubanRating?: number;
  goodreadsRating?: number;
  rank?: number;
  customDescription?: string;
  difficulty?: number;
  audiobookId?: string;
}

export type BookListType = 
  | 'RANKING'
  | 'EDITORS_PICK'
  | 'COLLECTION'
  | 'UNIVERSITY'
  | 'CELEBRITY'
  | 'ANNUAL_BEST'
  | 'AI_RECOMMENDED'
  | 'PERSONALIZED'
  | 'AI_FEATURED';

export interface BookList {
  id: string;
  name: string;
  nameEn?: string;
  subtitle?: string;
  description?: string;
  coverUrl?: string;
  type: BookListType;
  displayStyle?: string;
  bookCount: number;
  sortOrder?: number;
  isActive?: boolean;
  showRank?: boolean;
  showDescription?: boolean;
  maxDisplayCount?: number;
  isAiGenerated?: boolean;
  books?: BookListBook[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ReadingProgress {
  bookId: string;
  progress: number;
  currentChapter?: number;
  totalChapters: number;
  lastReadAt: Date;
}
