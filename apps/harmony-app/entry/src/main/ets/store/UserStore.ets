import { StoreKeys } from './StoreKeys';

export interface UserProfile {
  id: string;
  phone?: string;
  nickname: string;
  avatarUrl?: string;
  cefr?: string;
}

/**
 * UserStore 全局用户态。
 * - token 同时写 AppStorage（运行时）和 PreferencesManager（持久化），由 EntryAbility onCreate 加载。
 */
export class UserStore {
  static setToken(token: string, refreshToken?: string): void {
    AppStorage.SetOrCreate<string>(StoreKeys.USER_TOKEN, token);
    if (refreshToken) {
      AppStorage.SetOrCreate<string>(StoreKeys.USER_REFRESH_TOKEN, refreshToken);
    }
    AppStorage.SetOrCreate<boolean>(StoreKeys.USER_LOGGED_IN, true);
  }

  static getToken(): string {
    return AppStorage.Get<string>(StoreKeys.USER_TOKEN) ?? '';
  }

  static isLoggedIn(): boolean {
    return AppStorage.Get<boolean>(StoreKeys.USER_LOGGED_IN) === true;
  }

  static setProfile(profile: UserProfile): void {
    AppStorage.SetOrCreate<UserProfile>(StoreKeys.USER_PROFILE, profile);
  }

  static getProfile(): UserProfile | undefined {
    return AppStorage.Get<UserProfile>(StoreKeys.USER_PROFILE);
  }

  static clear(): void {
    AppStorage.Delete(StoreKeys.USER_TOKEN);
    AppStorage.Delete(StoreKeys.USER_REFRESH_TOKEN);
    AppStorage.Delete(StoreKeys.USER_PROFILE);
    AppStorage.SetOrCreate<boolean>(StoreKeys.USER_LOGGED_IN, false);
  }
}
