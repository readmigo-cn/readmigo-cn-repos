/**
 * AppStorage / 持久化 key 集中管理。
 * 命名约定：模块_字段，全部小写下划线。
 */
export class StoreKeys {
  // user
  static readonly USER_TOKEN: string = 'user_token';
  static readonly USER_REFRESH_TOKEN: string = 'user_refresh_token';
  static readonly USER_PROFILE: string = 'user_profile';
  static readonly USER_LOGGED_IN: string = 'user_logged_in';

  // settings
  static readonly SETTINGS_LOCALE: string = 'settings_locale';
  static readonly SETTINGS_THEME: string = 'settings_theme';
  static readonly SETTINGS_READER_FONT_SIZE: string = 'settings_reader_font_size';
  static readonly SETTINGS_READER_THEME: string = 'settings_reader_theme';

  // reading
  static readonly READING_CURRENT_BOOK: string = 'reading_current_book';
  static readonly READING_LAST_PROGRESS: string = 'reading_last_progress';

  // app
  static readonly APP_FIRST_LAUNCH: string = 'app_first_launch';
  static readonly APP_NAV_STACK: string = 'globalNavStack';
}
