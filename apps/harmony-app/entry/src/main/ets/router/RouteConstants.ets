/**
 * 路由常量集中管理。NavPathStack push 时只用这里的 key，禁止字面量。
 */
export class RoutePath {
  static readonly LOGIN: string = 'Login';
  static readonly ONBOARDING: string = 'Onboarding';
  static readonly MAIN: string = 'Main';
  static readonly DISCOVER: string = 'Discover';
  static readonly LIBRARY: string = 'Library';
  static readonly READER: string = 'Reader';
  static readonly ME: string = 'Me';
  static readonly AUDIOBOOK_TAB: string = 'AudiobookTab';
  static readonly AUDIOBOOK_PLAYER: string = 'AudiobookPlayer';
  static readonly SETTINGS: string = 'Settings';
}

export interface ReaderRouteParams {
  bookId: string;
  chapterId?: string;
}

export interface AudiobookPlayerParams {
  audiobookId: string;
  chapterIndex?: number;
}
