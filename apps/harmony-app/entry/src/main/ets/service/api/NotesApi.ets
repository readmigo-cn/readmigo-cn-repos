import { HttpClient } from '../HttpClient';

export type NoteKind = 'highlight' | 'note' | 'word';

export interface NoteRecord {
  id: string;
  bookId: string;
  chapterId: string | null;
  blockIndex: number;
  charOffset: number;
  charLength: number;
  originalText: string;
  noteText: string | null;
  kind: NoteKind;
  color: string | null;
  createdAt: string;
}

export interface CreateNotePayload {
  bookId: string;
  chapterId?: string;
  blockIndex?: number;
  charOffset?: number;
  charLength?: number;
  originalText: string;
  noteText?: string;
  kind?: NoteKind;
  color?: string;
}

export class NotesApi {
  static listByBook(bookId: string): Promise<NoteRecord[]> {
    return HttpClient.get<NoteRecord[]>('/notes', { bookId });
  }

  static list(): Promise<NoteRecord[]> {
    return HttpClient.get<NoteRecord[]>('/notes');
  }

  static create(payload: CreateNotePayload): Promise<NoteRecord> {
    return HttpClient.post<NoteRecord>('/notes', payload);
  }

  static delete(id: string): Promise<void> {
    return HttpClient.delete<void>(`/notes/${id}`);
  }
}
