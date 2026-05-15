/**
 * API service for book-related operations
 * 功能对齐：web/src/features/library/hooks/use-books.ts + overseas API client
 */

import type { Book, BookDetail, BookList, UserBook, ReadingProgress } from '../model/Book';

const BASE_URL = 'http://localhost:3000/api/v1'; // TODO: Move to config

export class BookApi {
  /**
   * Get books with pagination and filters
   * 功能对齐：useBooks hook from overseas
   */
  static async getBooks(params?: {
    category?: string;
    difficulty?: number;
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ data: Book[]; total: number; page: number }> {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.difficulty) queryParams.append('difficulty', params.difficulty.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);

    const response = await fetch(`${BASE_URL}/books?${queryParams.toString()}`);
    return response.json();
  }

  /**
   * Get book detail by ID
   * 功能对齐：useBookDetail hook from overseas
   */
  static async getBookDetail(bookId: string): Promise<BookDetail> {
    const response = await fetch(`${BASE_URL}/books/${bookId}`);
    const data = await response.json();
    return data.data;
  }

  /**
   * Get recommended books (AI / personalized)
   * 功能对齐：useRecommendedBooks from overseas
   */
  static async getRecommendedBooks(): Promise<Book[]> {
    const response = await fetch(`${BASE_URL}/books/recommended`);
    const data = await response.json();
    return data.data;
  }

  /**
   * Get popular books
   * 功能对齐：usePopularBooks from overseas
   */
  static async getPopularBooks(): Promise<Book[]> {
    const response = await fetch(`${BASE_URL}/books/popular`);
    const data = await response.json();
    return data.data;
  }

  /**
   * Get book lists (hero banners, curated collections)
   * 功能对齐：HeroBanner data from overseas library
   */
  static async getBookLists(): Promise<BookList[]> {
    const response = await fetch(`${BASE_URL}/book-lists`);
    const data = await response.json();
    return data.data;
  }

  /**
   * Get user's library (favorite books)
   * 功能对齐：useUserLibrary from overseas
   */
  static async getUserLibrary(): Promise<UserBook[]> {
    const response = await fetch(`${BASE_URL}/library`, {
      headers: { 'Authorization': 'Bearer TOKEN' } // TODO: Real auth
    });
    const data = await response.json();
    return data.data;
  }

  /**
   * Add book to library / favorites
   * 功能对齐：useToggleFavorite from overseas
   */
  static async addToLibrary(bookId: string): Promise<UserBook> {
    const response = await fetch(`${BASE_URL}/library`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer TOKEN'
      },
      body: JSON.stringify({ bookId })
    });
    const data = await response.json();
    return data.data;
  }

  /**
   * Remove book from library
   * 功能对齐：useRemoveFromLibrary from overseas
   */
  static async removeFromLibrary(bookId: string): Promise<void> {
    await fetch(`${BASE_URL}/library/${bookId}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer TOKEN' }
    });
  }

  /**
   * Update reading progress
   * 功能对齐：useMergedReadingProgress from overseas
   */
  static async updateProgress(bookId: string, progress: number, currentCfi?: string): Promise<void> {
    await fetch(`${BASE_URL}/reading-progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer TOKEN'
      },
      body: JSON.stringify({ bookId, progress, currentCfi })
    });
  }

  /**
   * Get reading progress for all books
   * 功能对齐：useMergedReadingProgress from overseas
   */
  static async getReadingProgress(): Promise<ReadingProgress[]> {
    const response = await fetch(`${BASE_URL}/reading-progress`, {
      headers: { 'Authorization': 'Bearer TOKEN' }
    });
    const data = await response.json();
    return data.data;
  }
}
