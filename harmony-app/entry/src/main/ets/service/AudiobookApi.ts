/**
 * Audiobook API service
 * 功能对齐：mobile/src/features/audiobook/services/audiobookApi.ts
 * 
 * API endpoints for audiobook streaming, progress sync, TTS generation
 */

import type {
  Audiobook,
  AudiobookListItem,
  AudiobookProgress,
  AudiobookChapter,
  PlaybackSpeed,
  PaginatedAudiobooks,
  TTSVoice,
} from '../model/Audiobook';

const BASE_URL = 'http://localhost:3000/api/v1'; // TODO: Move to config

export interface AudiobooksQueryParams {
  page?: number;
  limit?: number;
  bookId?: string;
  hasBookSync?: boolean;
  language?: string;
  search?: string;
  sortBy?: 'title' | 'author' | 'duration' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface UpdateProgressRequest {
  chapterIndex: number;
  positionSeconds: number;
  playbackSpeed?: PlaybackSpeed;
}

export interface GenerateTTSRequest {
  bookId: string;
  voiceId: string;
  chapterIds?: string[];
}

export interface GenerateTTSResponse {
  audiobookId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  estimatedTime?: number; // seconds
}

export class AudiobookApi {
  /**
   * Get audiobooks list with pagination
   * 功能对齐：useAudiobooks hook from overseas
   */
  static async getAudiobooks(params?: AudiobooksQueryParams): Promise<PaginatedAudiobooks> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.bookId) queryParams.append('bookId', params.bookId);
    if (params?.hasBookSync) queryParams.append('hasBookSync', params.hasBookSync.toString());
    if (params?.language) queryParams.append('language', params.language);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const response = await fetch(`${BASE_URL}/audiobooks?${queryParams.toString()}`);
    return response.json();
  }

  /**
   * Get audiobook detail by ID
   * 功能对齐：useAudiobook hook from overseas
   */
  static async getAudiobook(id: string): Promise<Audiobook> {
    const response = await fetch(`${BASE_URL}/audiobooks/${id}`);
    const data = await response.json();
    return data.data;
  }

  /**
   * Get audiobook for a specific book (Whispersync)
   * 功能对齐：useAudiobookForBook hook from overseas
   */
  static async getAudiobookForBook(bookId: string): Promise<Audiobook | null> {
    try {
      const response = await fetch(`${BASE_URL}/audiobooks/book/${bookId}`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.data;
    } catch {
      return null;
    }
  }

  /**
   * Get user's audiobook progress
   * 功能对齐：useAudiobookProgress hook from overseas
   */
  static async getProgress(audiobookId: string): Promise<AudiobookProgress | null> {
    try {
      const response = await fetch(`${BASE_URL}/audiobooks/${audiobookId}/progress`, {
        headers: { 'Authorization': 'Bearer TOKEN' } // TODO: Real auth
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.data;
    } catch {
      return null;
    }
  }

  /**
   * Update audiobook progress
   * 功能对齐：Progress sync from overseas
   */
  static async updateProgress(
    audiobookId: string,
    data: UpdateProgressRequest
  ): Promise<void> {
    await fetch(`${BASE_URL}/audiobooks/${audiobookId}/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer TOKEN'
      },
      body: JSON.stringify(data)
    });
  }

  /**
   * Get recently played audiobooks
   * 功能对齐：useRecentlyPlayedAudiobooks from overseas
   */
  static async getRecentlyPlayed(limit?: number): Promise<AudiobookListItem[]> {
    const url = limit
      ? `${BASE_URL}/audiobooks/recently-played?limit=${limit}`
      : `${BASE_URL}/audiobooks/recently-played`;
    const response = await fetch(url, {
      headers: { 'Authorization': 'Bearer TOKEN' }
    });
    const data = await response.json();
    return data.data;
  }

  /**
   * Search audiobooks
   * 功能对齐：useSearchAudiobooks from overseas
   */
  static async searchAudiobooks(query: string, limit?: number): Promise<AudiobookListItem[]> {
    const url = limit
      ? `${BASE_URL}/audiobooks/search?q=${encodeURIComponent(query)}&limit=${limit}`
      : `${BASE_URL}/audiobooks/search?q=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    const data = await response.json();
    return data.data;
  }

  /**
   * Generate TTS audiobook from ebook (国内化 - 科大讯飞 TTS)
   * 功能对齐：TTS generation from overseas audiolab
   */
  static async generateTTS(request: GenerateTTSRequest): Promise<GenerateTTSResponse> {
    const response = await fetch(`${BASE_URL}/audiobooks/tts/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer TOKEN'
      },
      body: JSON.stringify(request)
    });
    return response.json();
  }

  /**
   * Get available TTS voices (国内化 - 科大讯飞 voices)
   */
  static async getTTSVoices(): Promise<TTSVoice[]> {
    const response = await fetch(`${BASE_URL}/audiobooks/tts/voices`);
    const data = await response.json();
    return data.data;
  }

  /**
   * Get chapter timestamps for word-level highlighting
   */
  static async getChapterTimestamps(audiobookId: string, chapterIndex: number): Promise<AudiobookChapter> {
    const response = await fetch(
      `${BASE_URL}/audiobooks/${audiobookId}/chapters/${chapterIndex}/timestamps`,
      {
        headers: { 'Authorization': 'Bearer TOKEN' }
      }
    );
    const data = await response.json();
    return data.data;
  }

  /**
   * Get audiobook paragraph text for display
   */
  static async getParagraphText(
    audiobookId: string,
    chapterIndex: number,
    paragraphIndex: number
  ): Promise<string> {
    const response = await fetch(
      `${BASE_URL}/audiobooks/${audiobookId}/chapters/${chapterIndex}/paragraphs/${paragraphIndex}`,
      {
        headers: { 'Authorization': 'Bearer TOKEN' }
      }
    );
    const data = await response.json();
    return data.text;
  }
}
