/**
 * ContinuationManager — 阅读接续管理器（W11-C3）
 *
 * 职责：
 *   - 注册 / 注销当前阅读会话到 HarmonyOS 分布式数据（让附近设备发现可接续）
 *   - 周期检测附近可接续的设备列表（手机/平板/手表/PC）
 *   - 主动发起转移：把当前会话推到目标设备
 *   - 占位：实际能力依赖 W14 分布式接入
 *
 * 与 ContinueReadingAbility 的协作：
 *   - Reader 页 aboutToAppear → enableContinuation
 *   - Reader 页 aboutToDisappear → disableContinuation
 *   - 用户在转移面板选目标设备 → transferTo → 系统调用 ContinueReadingAbility.onContinue
 *
 * 数据通道选择：
 *   - 短期：分布式 KV（@ohos.distributedKVStore）— 跨设备同步当前阅读会话
 *   - 长期：HarmonyOS Continuation 框架（系统级 onContinue/onCreate hook）
 *
 * 当前实现：所有 distributed API 用占位 mock，不引入真实 import 避免编译失败。
 */

const TAG = 'ContinuationManager';

/** 跨设备同步的会话快照（写入分布式 KV 的 value 结构）。 */
export interface ContinuationSession {
  bookId: string;
  bookTitle: string;
  chapterIndex: number;
  pageIndex: number;
  percentComplete: number;
  /** 本地设备 ID（占位：实际由 deviceManager 提供）。 */
  sourceDeviceId: string;
  /** 写入时刻（ms），目标设备用此判断是否过期。 */
  updatedAt: number;
}

/** 附近可接续的设备摘要（用户面板展示用）。 */
export interface NearbyDevice {
  deviceId: string;
  deviceName: string;
  deviceType: 'phone' | 'tablet' | 'watch' | 'pc' | 'tv' | 'unknown';
  /** 该设备上是否已有同账号且可接收接续。 */
  trusted: boolean;
}

const KV_STORE_ID = 'readmigo_continuation';
const KV_KEY_PREFIX = 'reading_session_';

class ContinuationManagerImpl {
  /** 当前已注册的接续会话。null 表示未启用。 */
  private session: ContinuationSession | null = null;
  /** 周期检测附近设备的 timer。 */
  private pollTimer: number = -1;
  /** 缓存最近一次 pollNearbyDevices 的结果。 */
  private lastNearby: NearbyDevice[] = [];

  /**
   * 启用接续：注册当前阅读会话到分布式 KV。
   *
   * 调用时机：Reader 页 aboutToAppear / 章节切换。
   * 同 bookId 重复调用会覆盖之前的快照（更新 chapterIndex / pageIndex）。
   */
  enableContinuation(
    bookId: string,
    bookTitle: string,
    chapterIndex: number,
    pageIndex: number,
    percentComplete: number,
  ): void {
    if (!bookId) return;
    this.session = {
      bookId,
      bookTitle,
      chapterIndex,
      pageIndex,
      percentComplete,
      sourceDeviceId: this.getLocalDeviceId(),
      updatedAt: Date.now(),
    };
    this.writeToKvStore(this.session);
    this.startPolling();
    console.info(`${TAG} enableContinuation bookId=${bookId} chapter=${chapterIndex}`);
  }

  /**
   * 增量更新当前会话（不重置 timer）。
   * Reader 翻页 / 章节切换可频繁调用。
   */
  updateProgress(chapterIndex: number, pageIndex: number, percentComplete: number): void {
    if (!this.session) return;
    this.session.chapterIndex = chapterIndex;
    this.session.pageIndex = pageIndex;
    this.session.percentComplete = percentComplete;
    this.session.updatedAt = Date.now();
    this.writeToKvStore(this.session);
  }

  /**
   * 关闭接续：从分布式 KV 中删除会话条目，停止 polling。
   *
   * 调用时机：Reader 页 aboutToDisappear / 用户切换书籍。
   */
  disableContinuation(bookId: string): void {
    if (!this.session || this.session.bookId !== bookId) {
      this.stopPolling();
      this.session = null;
      return;
    }
    this.deleteFromKvStore(bookId);
    this.session = null;
    this.stopPolling();
    console.info(`${TAG} disableContinuation bookId=${bookId}`);
  }

  /**
   * 检测附近可接续的设备。
   *
   * 实际实现：@ohos.distributedDeviceManager.getAvailableDeviceListSync()
   * 占位：返回空列表 + console 标记。
   *
   * 周期内反复调用会去重（lastNearby cache）。
   */
  async pollNearbyDevices(): Promise<NearbyDevice[]> {
    // 占位：真实实现示例
    // const dm = deviceManager.createDeviceManager('cn.readmigo.app');
    // const list = dm.getAvailableDeviceListSync();
    // this.lastNearby = list.map((d) => ({...}));
    this.lastNearby = [];
    console.info(`${TAG} pollNearbyDevices (mock) found=${this.lastNearby.length}`);
    return this.lastNearby;
  }

  /** 同步获取最近一次缓存的设备列表（无 IO）。 */
  getCachedNearbyDevices(): NearbyDevice[] {
    return this.lastNearby;
  }

  /**
   * 主动转移到目标设备。
   *
   * 实际实现：context.continueAbility(deviceId, want)
   * 占位：把目标 deviceId 写到日志，业务层用 toast 反馈。
   */
  async transferTo(deviceId: string): Promise<boolean> {
    if (!this.session) {
      console.warn(`${TAG} transferTo no active session`);
      return false;
    }
    if (!deviceId) {
      console.warn(`${TAG} transferTo empty deviceId`);
      return false;
    }
    console.info(`${TAG} transferTo (mock) targetDevice=${deviceId} bookId=${this.session.bookId}`);
    return true;
  }

  /** 当前是否有活跃的接续会话。 */
  hasActiveSession(): boolean {
    return this.session !== null;
  }

  getActiveSession(): ContinuationSession | null {
    return this.session;
  }

  // ─────────── private ───────────

  private startPolling(): void {
    if (this.pollTimer !== -1) return;
    this.pollTimer = setInterval(() => {
      this.pollNearbyDevices().catch(() => {});
    }, 30_000) as unknown as number;
  }

  private stopPolling(): void {
    if (this.pollTimer !== -1) {
      clearInterval(this.pollTimer);
      this.pollTimer = -1;
    }
  }

  /**
   * 占位：写入分布式 KV。
   *
   * 真实实现：
   *   const kvManager = distributedKVStore.createKVManager({ context, bundleName });
   *   const store = kvManager.getKVStore(KV_STORE_ID, options);
   *   store.put(KV_KEY_PREFIX + session.bookId, JSON.stringify(session));
   */
  private writeToKvStore(session: ContinuationSession): void {
    const key = KV_KEY_PREFIX + session.bookId;
    console.info(`${TAG} kv.put (mock) ${key} chapter=${session.chapterIndex}`);
  }

  /** 占位：从分布式 KV 删除条目。 */
  private deleteFromKvStore(bookId: string): void {
    const key = KV_KEY_PREFIX + bookId;
    console.info(`${TAG} kv.delete (mock) ${key}`);
  }

  /** 占位：获取本地设备 ID。 */
  private getLocalDeviceId(): string {
    // 真实：deviceManager.getLocalDeviceInfoSync().deviceId
    return 'local-device';
  }
}

/** 单例导出 */
export const ContinuationManager = new ContinuationManagerImpl();
