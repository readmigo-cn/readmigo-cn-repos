import dataPreferences from '@ohos.data.preferences';
import common from '@ohos.app.ability.common';

const STORE_NAME = 'readmigo_prefs';

/**
 * KV 持久化封装。
 * 用法：先在 EntryAbility.onCreate 调 init(context)，之后随处可用。
 */
export class PreferencesManager {
  private static prefs: dataPreferences.Preferences | null = null;

  static async init(context: common.UIAbilityContext): Promise<void> {
    PreferencesManager.prefs = await dataPreferences.getPreferences(context, STORE_NAME);
  }

  static async getString(key: string, def: string = ''): Promise<string> {
    if (!PreferencesManager.prefs) return def;
    const v = await PreferencesManager.prefs.get(key, def);
    return typeof v === 'string' ? v : def;
  }

  static async setString(key: string, value: string): Promise<void> {
    if (!PreferencesManager.prefs) return;
    await PreferencesManager.prefs.put(key, value);
    await PreferencesManager.prefs.flush();
  }

  static async getBool(key: string, def: boolean = false): Promise<boolean> {
    if (!PreferencesManager.prefs) return def;
    const v = await PreferencesManager.prefs.get(key, def);
    return typeof v === 'boolean' ? v : def;
  }

  static async setBool(key: string, value: boolean): Promise<void> {
    if (!PreferencesManager.prefs) return;
    await PreferencesManager.prefs.put(key, value);
    await PreferencesManager.prefs.flush();
  }

  static async remove(key: string): Promise<void> {
    if (!PreferencesManager.prefs) return;
    await PreferencesManager.prefs.delete(key);
    await PreferencesManager.prefs.flush();
  }
}
