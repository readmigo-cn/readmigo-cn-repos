import UIAbility from '@ohos.app.ability.UIAbility';
import AbilityConstant from '@ohos.app.ability.AbilityConstant';
import Want from '@ohos.app.ability.Want';
import window from '@ohos.window';
import Configuration from '@ohos.app.ability.Configuration';
import { PreferencesManager } from '../persistence/PreferencesManager';
import { DatabaseManager } from '../persistence/DatabaseManager';
import { UserStore } from '../store/UserStore';
import { ReadingStore } from '../store/ReadingStore';
import { SettingsStore } from '../store/SettingsStore';
import { StoreKeys } from '../store/StoreKeys';
import { RouterService } from '../router/RouterService';
import { PagePath } from '../router/RouteConstants';
import { ThemeService } from '../theme/ThemeService';
import { FontRegistry } from '../theme/FontRegistry';
import { ProgressSync } from '../service/ProgressSync';
// W14-C1：自适应布局 / 折叠屏感知。需要 windowStage，因此在 onWindowStageCreate 里初始化
import { initBreakpoints, disposeBreakpoints } from '../theme/Breakpoints';
// W13-C1 / W13-C3：分布式设备发现 + 接续生命周期
import { DeviceManager } from '../service/distributed/DeviceManager';
import { ContinuationManager } from '../service/atomic/ContinuationManager';
// W13-C2：跨端剪贴板订阅（接收其它设备分享的 vocab / highlight）
import { DistributedClipboard, IncomingEntry } from '../service/distributed/DistributedClipboard';
// W13-C4：多端通知协调器
import { MultiDeviceNotifier } from '../service/notification/MultiDeviceNotifier';
// W18-C1 / C2 / C3：埋点 + 双轨崩溃监控
import { Analytics } from '../service/analytics/AnalyticsProvider';
import { SensorsAnalytics, SaEvents } from '../service/analytics/SensorsAnalytics';
import { AgcCrashReporter } from '../service/monitoring/AgcCrashReporter';
import { SentryClient } from '../service/monitoring/SentryClient';
import { CrashHandler } from '../service/monitoring/CrashHandler';
// W18-C4 / C5 / C7：HMS Push + 通知通道 + 远程配置 / A/B
import { HmsPushService } from '../service/push/HmsPushService';
import { NotificationChannel } from '../service/push/NotificationChannel';
import { RemoteConfig } from '../service/experiments/RemoteConfig';

const TAG = 'EntryAbility';

// 神策 / AGC / Sentry 接入参数（生产环境从远端配置中心拉取）
const SA_SERVER_URL = 'https://sa.readmigo.cn/sa';
const SA_PROJECT_NAME = 'readmigo_harmony';
const AGC_APP_ID = '_PLACEHOLDER_AGC_APP_ID_';
const SENTRY_DSN = 'https://_placeholder_@sentry.io/_placeholder_';
const SENTRY_ENV = 'production';

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

      // W18-C2 / C3：崩溃监控必须最早初始化，确保后续 init 异常也能被拦截
      AgcCrashReporter.init(AGC_APP_ID);
      SentryClient.init(SENTRY_DSN, SENTRY_ENV);
      CrashHandler.init();

      // W18-C1：神策埋点（HTTP 上报，独立于业务初始化失败）
      const sa = SensorsAnalytics.getInstance();
      await sa.init(SA_SERVER_URL, SA_PROJECT_NAME);
      sa.registerSuperProperties({
        '$os': 'HarmonyOS',
        '$lib': 'harmony',
        'app_channel': 'cn',
      });
      Analytics.register(sa);

      // 三个 Store 顺序回灌（彼此独立，可并行；保持简单串行更易排错）
      await UserStore.init();
      await ReadingStore.init();
      await SettingsStore.init();

      // 已登录态 → 把 userId 关联到崩溃 + 埋点
      if (UserStore.isAuthenticated()) {
        const profile = UserStore.getProfile();
        if (profile && profile.id) {
          AgcCrashReporter.setUserId(profile.id);
          SentryClient.setUser({ id: profile.id, email: profile.email });
          Analytics.identify(profile.id);
        }
      }

      // 上次启动若崩溃 → toast + 重发
      CrashHandler.checkPendingCrashOnLaunch().catch(() => {});

      // W5-C4 主题：必须在 SettingsStore 之后
      ThemeService.init(this.context);
      // W5-C5 字体：缺文件容错，不阻塞启动
      FontRegistry.registerFonts(this.context).catch((err: Error) => {
        console.warn(`${TAG} font registration failed: ${err.message}`);
      });

      // W7-C6：恢复进度同步队列（崩溃续传）
      ProgressSync.init().catch((err: Error) => {
        console.warn(`${TAG} ProgressSync init failed: ${err.message}`);
      });

      // W13-C1：初始化分布式设备管理器（bundleName 必须与 module.json5 一致）
      DeviceManager.init('cn.readmigo.app').catch((err: Error) => {
        console.warn(`${TAG} DeviceManager init failed: ${err.message}`);
      });

      // W13-C4：多端通知协调器（订阅跨端 broadcast，决定本机是否 publish）
      MultiDeviceNotifier.init().catch((err: Error) => {
        console.warn(`${TAG} MultiDeviceNotifier init failed: ${err.message}`);
      });

      // W18-C7：远程配置 + A/B 实验。先于 push 初始化，保证 push topic / channel 决策能拿到最新配置
      RemoteConfig.init().catch((err: Error) => {
        console.warn(`${TAG} RemoteConfig init failed: ${err.message}`);
      });

      // W18-C4：HMS Push Kit 初始化（拿 token + 订阅默认 topic）
      HmsPushService.init()
        .then(() => {
          // 已登录态 → 立即上报 token 绑定 userId
          if (UserStore.isAuthenticated()) {
            const profile = UserStore.getProfile();
            if (profile && profile.id) {
              HmsPushService.reportToken(profile.id).catch(() => {});
            }
          }
        })
        .catch((err: Error) => {
          console.warn(`${TAG} HmsPushService init failed: ${err.message}`);
        });

      // W18-C5：通知通道（6 类）+ 落档到 NotificationCenter
      NotificationChannel.init().catch((err: Error) => {
        console.warn(`${TAG} NotificationChannel init failed: ${err.message}`);
      });

      // W13-C2：监听 pasteboard 变化，收到其它设备的 vocab/highlight 时把 entry
      // 写入 AppStorage，由当前活跃页（Reader / Vocab / Index）渲染 PasteFromOtherDeviceSheet
      DistributedClipboard.subscribeIncoming((entry: IncomingEntry) => {
        if (entry.kind === 'vocab' || entry.kind === 'highlight') {
          AppStorage.SetOrCreate<IncomingEntry>('paste_incoming_entry', entry);
          AppStorage.SetOrCreate<boolean>('paste_incoming_visible', true);
        }
      });

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

    // W14-C1：注册断点 / 折叠屏监听 → AppStorage（UI 通过 @StorageProp 订阅）
    initBreakpoints(windowStage).catch((err: Error) => {
      console.warn(`${TAG} initBreakpoints failed: ${err.message}`);
    });
  }

  onWindowStageDestroy(): void {
    // 释放运行时缓存
    RouterService.clearHistory();
    // W14-C1：解除窗口尺寸 / 折叠屏监听
    disposeBreakpoints();
  }

  onForeground(): void {
    // 恢复 reading session：当前没有 active timer，留给 Reader 页 onPageShow 触发
    console.info(`${TAG} onForeground`);
    // W7-C6：恢复联机后立即把队列里残留的更新推上去
    ProgressSync.flush().catch(() => {});
    // W13-C3：恢复设备 polling
    ContinuationManager.onAppForeground();
    // W13-C4：刷新「最近活跃」时间戳，参与多端通知去重判定
    MultiDeviceNotifier.markActive();
  }

  onBackground(): void {
    // 暂停 reading session + 强制 flush 进度
    const progress = ReadingStore.getLastProgress();
    if (progress) {
      ReadingStore.setLastProgress(progress); // 触发一次 flush
    }
    // W7-C6：进入后台前强制 flush，避免因系统挂起丢失最新进度
    ProgressSync.flush().catch(() => {});
    // W13-C3：暂停设备 polling 节省电量
    ContinuationManager.onAppBackground();
    // W18-C1：埋点队列立即 flush，避免系统挂起丢事件
    Analytics.track(SaEvents.APP_BACKGROUNDED, {});
    Analytics.flush().catch(() => {});
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

  /**
   * 系统配置变化（暗色模式切换、locale 变更等）。
   * W5-C4：把 colorMode 转给 ThemeService 重算。
   */
  onConfigurationUpdate(newConfig: Configuration): void {
    try {
      if (newConfig && typeof newConfig.colorMode === 'number') {
        ThemeService.onSystemColorModeChange(newConfig.colorMode);
      }
    } catch (err) {
      const e = err as Error;
      console.warn(`${TAG} onConfigurationUpdate failed: ${e.message}`);
    }
  }

  onDestroy(): void {
    console.info(`${TAG} onDestroy`);
  }

  /**
   * 根据 want.parameters.target 决定深链落到哪个子 ability。
   * deep link / shortcut 解析完得到一个 logical target，再 startAbility 到对应 ability。
   *
   *   target=reader  -> ReaderAbility
   *   target=library -> LibraryAbility
   *   target=settings-> SettingsAbility
   *   target=audio   -> AudioAbility
   *   default        -> EntryAbility（继续走 NavPathStack 路由）
   *
   * 不在 onCreate 自动 startAbility，由 RouterService 在 NavPathStack 就绪后调用。
   */
  getDispatchedAbility(want: Want): string {
    if (!want || !want.parameters) {
      return 'EntryAbility';
    }
    const params = want.parameters as Record<string, Object>;
    const target = (params.target as string) ?? '';
    switch (target) {
      case 'reader':
        return 'ReaderAbility';
      case 'library':
        return 'LibraryAbility';
      case 'settings':
        return 'SettingsAbility';
      case 'audio':
        return 'AudioAbility';
      default:
        return 'EntryAbility';
    }
  }
}
