/**
 * 路由常量集中管理。NavPathStack push 时只用这里的 key，禁止字面量。
 *
 * 两类常量：
 *   - RoutePath.*：NavPathStack 的命名路由（@Builder 在 Index.ets 内通过 navDestination 解析）
 *   - PagePath.*：windowStage.loadContent / router.pushUrl 用的 main_pages.json 路径
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
  static readonly NOTES: string = 'Notes';
  /**
   * 开发者工具：原生组件 demo（W2-C5）。
   * 实际页路径：pages/native/XComponentDemo（router.pushUrl 使用）。
   */
  static readonly XCOMPONENT_DEMO: string = 'xcomponent-demo';
  static readonly XCOMPONENT_DEMO_URL: string = 'pages/native/XComponentDemo';
  /** 别名：与任务命名对齐。 */
  static readonly NATIVE_DEMO: string = 'xcomponent-demo';
}

/**
 * windowStage.loadContent / router.pushUrl 使用的页面相对路径。
 * 必须与 main_pages.json 中的 src 项一致。
 */
export class PagePath {
  static readonly INDEX: string = 'pages/Index';
  static readonly LOGIN: string = 'pages/Login';
  static readonly ONBOARDING: string = 'pages/Onboarding';
  static readonly DISCOVER: string = 'pages/Discover';
  static readonly LIBRARY: string = 'pages/Library';
  static readonly READER: string = 'pages/Reader';
  static readonly NOTES: string = 'pages/Notes';
  static readonly ME: string = 'pages/Me';
  static readonly AUDIOBOOK_TAB: string = 'pages/AudiobookTab';
  static readonly AUDIOBOOK_PLAYER: string = 'pages/AudiobookPlayer';
}

/** 需要登录态才能进的路由（router auth-guard 使用）。 */
export const AUTH_REQUIRED_ROUTES: ReadonlySet<string> = new Set<string>([
  RoutePath.LIBRARY,
  RoutePath.READER,
  RoutePath.ME,
  RoutePath.NOTES,
  RoutePath.AUDIOBOOK_PLAYER,
]);

// ---- Route param 类型 ----

export interface ReaderRouteParams {
  bookId: string;
  chapterId?: string;
}

export interface AudiobookPlayerParams {
  audiobookId: string;
  chapterIndex?: number;
}

export interface LoginRouteParams {
  /** 登录成功后跳转的目标路由名（可选）。 */
  redirectTo?: string;
  redirectParams?: object;
}

export interface OnboardingRouteParams {
  step?: number;
}

export interface NotesRouteParams {
  bookId?: string;
}

export interface DiscoverRouteParams {
  category?: string;
}

export interface MeRouteParams {}
export interface LibraryRouteParams {}
export interface AudiobookTabRouteParams {}
export interface NativeDemoRouteParams {}

/** Deep link 解析结果。 */
export interface DeepLinkTarget {
  route: string;
  params: object | null;
}
