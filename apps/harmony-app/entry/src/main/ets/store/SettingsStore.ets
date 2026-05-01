import { StoreKeys } from './StoreKeys';

export type AppLocale = 'zh-CN' | 'zh-TW' | 'en-US';
export type AppThemeMode = 'system' | 'light' | 'dark';
export type ReaderTheme = 'day' | 'night' | 'paper';

export class SettingsStore {
  static getLocale(): AppLocale {
    return AppStorage.Get<AppLocale>(StoreKeys.SETTINGS_LOCALE) ?? 'zh-CN';
  }

  static setLocale(v: AppLocale): void {
    AppStorage.SetOrCreate<AppLocale>(StoreKeys.SETTINGS_LOCALE, v);
  }

  static getThemeMode(): AppThemeMode {
    return AppStorage.Get<AppThemeMode>(StoreKeys.SETTINGS_THEME) ?? 'system';
  }

  static setThemeMode(v: AppThemeMode): void {
    AppStorage.SetOrCreate<AppThemeMode>(StoreKeys.SETTINGS_THEME, v);
  }

  static getReaderFontSize(): number {
    return AppStorage.Get<number>(StoreKeys.SETTINGS_READER_FONT_SIZE) ?? 17;
  }

  static setReaderFontSize(v: number): void {
    AppStorage.SetOrCreate<number>(StoreKeys.SETTINGS_READER_FONT_SIZE, v);
  }

  static getReaderTheme(): ReaderTheme {
    return AppStorage.Get<ReaderTheme>(StoreKeys.SETTINGS_READER_THEME) ?? 'day';
  }

  static setReaderTheme(v: ReaderTheme): void {
    AppStorage.SetOrCreate<ReaderTheme>(StoreKeys.SETTINGS_READER_THEME, v);
  }
}
