import UIAbility from '@ohos.app.ability.UIAbility';
import AbilityConstant from '@ohos.app.ability.AbilityConstant';
import Want from '@ohos.app.ability.Want';
import window from '@ohos.window';
import { PreferencesManager } from '../persistence/PreferencesManager';
import { DatabaseManager } from '../persistence/DatabaseManager';
import { UserStore } from '../store/UserStore';
import { ReadingStore } from '../store/ReadingStore';
import { SettingsStore } from '../store/SettingsStore';
import { StoreKeys } from '../store/StoreKeys';
import { RouterService } from '../router/RouterService';
import { PagePath } from '../router/RouteConstants';

const TAG = 'EntryAbility';

/**
 * EntryAbility：app 进程入口。
 *
 * 责任：
 *   1) 启动期初始化：Preferences -> RDB -> 三个 Store 回灌 AppStorage
 *   2) 决定首页：first launch -> Onboarding；未登录 -> Login（W4 已在 Index.ets 内做二次保护）
 *   3) Deep link：从 cold-launch want.uri 提取，待 NavPathStack 就绪后跳转
 *   4) Lifecycle：onForeground / onBackground 触发 reading session 暂停/恢复
 *   5) onMemoryLevel：低内存时清运行时缓存（route history、recent books AppStorage 引用）
 */
export default class EntryAbility extends UIAbility {
  private pendingDeepLink: string = '';
  private isFirstLaunch: boolean = false;

  async onCreate(want: Want, _launchParam: AbilityConstant.LaunchParam): Promise<void> {
    try {
      await PreferencesManager.init(this.context);
      await DatabaseManager.init(this.context);

      // 三个 Store 顺序回灌（彼此独立，可并行；保持简单串行更易排错）
      await UserStore.init();
      await ReadingStore.init();
      await SettingsStore.init();

      // 首次启动判定：APP_FIRST_LAUNCH 默认 true，初始化后写 false
      const seen = await PreferencesManager.getBool(StoreKeys.APP_FIRST_LAUNCH, false);
      this.isFirstLaunch = !seen;
      if (this.isFirstLaunch) {
        await PreferencesManager.setBool(StoreKeys.APP_FIRST_LAUNCH, true);
      }

      // Token 有效性检查（占位）：Phase 4 接入 /auth/refresh
      // 当前策略：本地有 token 即认为已登录，HttpClient 401 时再走 UserStore.clear()
      if (UserStore.isAuthenticated()) {
        // TODO(Phase 4): try refresh-token if expired
      }

      // Cold launch deep link：want.uri 形如 readmigo://book/:slug
      if (want && want.uri) {
        this.pendingDeepLink = want.uri;
        AppStorage.SetOrCreate<string>(StoreKeys.APP_PENDING_DEEP_LINK, want.uri);
      }
    } catch (err) {
      const e = err as Error;
      console.error(`${TAG} init failed: ${e.message}`);
    }
  }

  /**
   * 热启动 / 单实例复用时收到新 want。
   */
  onNewWant(want: Want, _launchParam: AbilityConstant.LaunchParam): void {
    if (want && want.uri) {
      this.pendingDeepLink = want.uri;
      AppStorage.SetOrCreate<string>(StoreKeys.APP_PENDING_DEEP_LINK, want.uri);
      // NavPathStack 应该已经 bound，可以直接跳转
      RouterService.handleDeepLink(want.uri);
    }
  }

  onWindowStageCreate(windowStage: window.WindowStage): void {
    // 首页统一为 pages/Index：内部根据 UserStore.isLoggedIn / first-launch 决定
    // 在 NavPathStack 上 push Login / Onboarding。这样保持 windowStage.loadContent
    // 单一入口，避免冷启动加载多页造成的状态错乱。
    windowStage.loadContent(PagePath.INDEX, (error) => {
      if (error.code) {
        console.error(`${TAG} loadContent failed: ${error.code} ${error.message}`);
        return;
      }
      // first-launch / pending deep link 标记给 Index.ets 消费
      AppStorage.SetOrCreate<boolean>(StoreKeys.APP_FIRST_LAUNCH, this.isFirstLaunch);
      // pendingDeepLink 在 Index aboutToAppear 后由 RouterService.handleDeepLink 消费
    });
  }

  onWindowStageDestroy(): void {
    // 释放运行时缓存
    RouterService.clearHistory();
  }

  onForeground(): void {
    // 恢复 reading session：当前没有 active timer，留给 Reader 页 onPageShow 触发
    console.info(`${TAG} onForeground`);
  }

  onBackground(): void {
    // 暂停 reading session + 强制 flush 进度
    const progress = ReadingStore.getLastProgress();
    if (progress) {
      ReadingStore.setLastProgress(progress); // 触发一次 flush
    }
    console.info(`${TAG} onBackground`);
  }

  /**
   * 系统内存压力回调。level 0=MODERATE 1=LOW 2=CRITICAL（依 SDK 文档）。
   * 这里只清运行时引用，持久层不动。
   */
  onMemoryLevel(level: AbilityConstant.MemoryLevel): void {
    console.info(`${TAG} onMemoryLevel ${level}`);
    if (level >= AbilityConstant.MemoryLevel.MEMORY_LEVEL_LOW) {
      RouterService.clearHistory();
    }
  }

  onDestroy(): void {
    console.info(`${TAG} onDestroy`);
  }
}
