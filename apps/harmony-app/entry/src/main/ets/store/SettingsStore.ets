import { StoreKeys } from './StoreKeys';
import { PreferencesManager } from '../persistence/PreferencesManager';

export type AppLocale = 'zh-CN' | 'zh-TW' | 'en-US' | 'en';
export type AppThemeMode = 'system' | 'light' | 'dark';
export type ReaderTheme = 'day' | 'night' | 'paper' | 'sepia' | 'system';

export interface NotificationSettings {
  dailyReminder: boolean;
  time: string; // 'HH:mm'
}

export interface TtsSettings {
  voice: string;
  speed: number; // 0.5 - 2.0
}

const FONT_SIZE_MIN = 14;
const FONT_SIZE_MAX = 24;
const LINE_HEIGHT_MIN = 1.4;
const LINE_HEIGHT_MAX = 2.0;

/**
 * SettingsStore：阅读/通知/TTS/主题/语言。
 *
 * 持久化策略：所有字段以字符串形式存 PreferencesManager；数值用 toString()/parseFloat。
 * AppStorage 持运行时类型（number/boolean/object），UI 直接读。
 */
export class SettingsStore {
  static async init(): Promise<void> {
    const locale = (await PreferencesManager.getString(StoreKeys.SETTINGS_LOCALE, 'zh-CN')) as AppLocale;
    const theme = (await PreferencesManager.getString(StoreKeys.SETTINGS_THEME, 'system')) as AppThemeMode;
    const fontSize = await PreferencesManager.getString(StoreKeys.SETTINGS_READER_FONT_SIZE, '17');
    const readerTheme = (await PreferencesManager.getString(StoreKeys.SETTINGS_READER_THEME, 'day')) as ReaderTheme;
    const lineHeight = await PreferencesManager.getString(StoreKeys.SETTINGS_READER_LINE_HEIGHT, '1.6');
    const dailyReminder = await PreferencesManager.getBool(StoreKeys.SETTINGS_NOTIFICATIONS_DAILY, false);
    const reminderTime = await PreferencesManager.getString(StoreKeys.SETTINGS_NOTIFICATIONS_TIME, '20:00');
    const ttsVoice = await PreferencesManager.getString(StoreKeys.SETTINGS_TTS_VOICE, 'default');
    const ttsSpeed = await PreferencesManager.getString(StoreKeys.SETTINGS_TTS_SPEED, '1.0');

    AppStorage.SetOrCreate<AppLocale>(StoreKeys.SETTINGS_LOCALE, locale);
    AppStorage.SetOrCreate<AppThemeMode>(StoreKeys.SETTINGS_THEME, theme);
    AppStorage.SetOrCreate<number>(
      StoreKeys.SETTINGS_READER_FONT_SIZE,
      SettingsStore.clampInt(parseInt(fontSize, 10), FONT_SIZE_MIN, FONT_SIZE_MAX, 17),
    );
    AppStorage.SetOrCreate<ReaderTheme>(StoreKeys.SETTINGS_READER_THEME, readerTheme);
    AppStorage.SetOrCreate<number>(
      StoreKeys.SETTINGS_READER_LINE_HEIGHT,
      SettingsStore.clampFloat(parseFloat(lineHeight), LINE_HEIGHT_MIN, LINE_HEIGHT_MAX, 1.6),
    );
    AppStorage.SetOrCreate<NotificationSettings>(
      StoreKeys.SETTINGS_NOTIFICATIONS_DAILY,
      { dailyReminder, time: reminderTime },
    );
    AppStorage.SetOrCreate<TtsSettings>(StoreKeys.SETTINGS_TTS_VOICE, {
      voice: ttsVoice,
      speed: parseFloat(ttsSpeed) || 1.0,
    });
  }

  // ---- Locale ----
  static getLocale(): AppLocale {
    return AppStorage.Get<AppLocale>(StoreKeys.SETTINGS_LOCALE) ?? 'zh-CN';
  }

  static setLocale(v: AppLocale): void {
    AppStorage.SetOrCreate<AppLocale>(StoreKeys.SETTINGS_LOCALE, v);
    PreferencesManager.setString(StoreKeys.SETTINGS_LOCALE, v);
  }

  // ---- App Theme Mode ----
  static getThemeMode(): AppThemeMode {
    return AppStorage.Get<AppThemeMode>(StoreKeys.SETTINGS_THEME) ?? 'system';
  }

  static setThemeMode(v: AppThemeMode): void {
    AppStorage.SetOrCreate<AppThemeMode>(StoreKeys.SETTINGS_THEME, v);
    PreferencesManager.setString(StoreKeys.SETTINGS_THEME, v);
  }

  // ---- Reader Font Size ----
  static getReaderFontSize(): number {
    return AppStorage.Get<number>(StoreKeys.SETTINGS_READER_FONT_SIZE) ?? 17;
  }

  static setReaderFontSize(v: number): void {
    const clamped = SettingsStore.clampInt(v, FONT_SIZE_MIN, FONT_SIZE_MAX, 17);
    AppStorage.SetOrCreate<number>(StoreKeys.SETTINGS_READER_FONT_SIZE, clamped);
    PreferencesManager.setString(StoreKeys.SETTINGS_READER_FONT_SIZE, clamped.toString());
  }

  // ---- Reader Theme ----
  static getReaderTheme(): ReaderTheme {
    return AppStorage.Get<ReaderTheme>(StoreKeys.SETTINGS_READER_THEME) ?? 'day';
  }

  static setReaderTheme(v: ReaderTheme): void {
    AppStorage.SetOrCreate<ReaderTheme>(StoreKeys.SETTINGS_READER_THEME, v);
    PreferencesManager.setString(StoreKeys.SETTINGS_READER_THEME, v);
  }

  // ---- Reader Line Height ----
  static getReaderLineHeight(): number {
    return AppStorage.Get<number>(StoreKeys.SETTINGS_READER_LINE_HEIGHT) ?? 1.6;
  }

  static setReaderLineHeight(v: number): void {
    const clamped = SettingsStore.clampFloat(v, LINE_HEIGHT_MIN, LINE_HEIGHT_MAX, 1.6);
    AppStorage.SetOrCreate<number>(StoreKeys.SETTINGS_READER_LINE_HEIGHT, clamped);
    PreferencesManager.setString(StoreKeys.SETTINGS_READER_LINE_HEIGHT, clamped.toString());
  }

  // ---- Notifications ----
  static getNotifications(): NotificationSettings {
    return (
      AppStorage.Get<NotificationSettings>(StoreKeys.SETTINGS_NOTIFICATIONS_DAILY) ?? {
        dailyReminder: false,
        time: '20:00',
      }
    );
  }

  static setNotifications(v: NotificationSettings): void {
    AppStorage.SetOrCreate<NotificationSettings>(StoreKeys.SETTINGS_NOTIFICATIONS_DAILY, v);
    PreferencesManager.setBool(StoreKeys.SETTINGS_NOTIFICATIONS_DAILY, v.dailyReminder);
    PreferencesManager.setString(StoreKeys.SETTINGS_NOTIFICATIONS_TIME, v.time);
  }

  // ---- TTS ----
  static getTts(): TtsSettings {
    return (
      AppStorage.Get<TtsSettings>(StoreKeys.SETTINGS_TTS_VOICE) ?? {
        voice: 'default',
        speed: 1.0,
      }
    );
  }

  static setTts(v: TtsSettings): void {
    AppStorage.SetOrCreate<TtsSettings>(StoreKeys.SETTINGS_TTS_VOICE, v);
    PreferencesManager.setString(StoreKeys.SETTINGS_TTS_VOICE, v.voice);
    PreferencesManager.setString(StoreKeys.SETTINGS_TTS_SPEED, v.speed.toString());
  }

  private static clampInt(v: number, min: number, max: number, def: number): number {
    if (Number.isNaN(v) || !Number.isFinite(v)) return def;
    if (v < min) return min;
    if (v > max) return max;
    return Math.round(v);
  }

  private static clampFloat(v: number, min: number, max: number, def: number): number {
    if (Number.isNaN(v) || !Number.isFinite(v)) return def;
    if (v < min) return min;
    if (v > max) return max;
    return v;
  }
}
