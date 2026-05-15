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

  /**
   * 忘记密码 / 重置密码（未登录可访问，无 auth guard）。
   * router.pushUrl 用 PASSWORD_RESET_URL；name key 保留用于将来切换到 NavPathStack。
   */
  static readonly PASSWORD_RESET: string = 'password-reset';
  static readonly PASSWORD_RESET_URL: string = 'pages/PasswordReset';

  /**
   * 开发者工具：W6 组件演示页（W6-C10）。
   * 实际页路径：pages/dev/ComponentGallery（router.pushUrl 使用）。
   */
  static readonly COMPONENT_GALLERY: string = 'component-gallery';
  static readonly COMPONENT_GALLERY_URL: string = 'pages/dev/ComponentGallery';

  /**
   * W9-C5：词汇量统计 dashboard。
   */
  static readonly VOCAB_STATS: string = 'vocab-stats';
  static readonly VOCAB_STATS_URL: string = 'pages/VocabStats';

  /**
   * W9-C8：弱点分析报告。
   */
  static readonly WEAKNESS_ANALYSIS: string = 'weakness-analysis';
  static readonly WEAKNESS_ANALYSIS_URL: string = 'pages/WeaknessAnalysis';

  /**
   * W9-C3：单词联想 mind-map 页。
   */
  static readonly WORD_ASSOCIATION: string = 'word-association';
  static readonly WORD_ASSOCIATION_URL: string = 'pages/WordAssociation';

  /**
   * W9-C4：词族分析页。
   */
  static readonly WORD_FAMILY: string = 'word-family';
  static readonly WORD_FAMILY_URL: string = 'pages/WordFamily';

  /**
   * W9-C6：AI 个性化学习计划页。
   */
  static readonly STUDY_PLAN: string = 'StudyPlan';
  static readonly STUDY_PLAN_URL: string = 'pages/StudyPlan';

  /**
   * W9-C7：阅读理解题页（书内 toolbar 触发，传 bookId / chapterIndex）。
   */
  static readonly READING_COMPREHENSION: string = 'ReadingComprehension';
  static readonly READING_COMPREHENSION_URL: string = 'pages/ReadingComprehension';

  /**
   * W9-C1：生词本主页（auth required，NavPathStack 命名路由）。
   */
  static readonly VOCAB: string = 'vocab';
  static readonly VOCAB_URL: string = 'pages/Vocab';

  /**
   * W9-C2：闪卡 SRS 复习页（auth required，NavPathStack 命名路由）。
   */
  static readonly FLASHCARD_SESSION: string = 'flashcard-session';
  static readonly FLASHCARD_SESSION_URL: string = 'pages/FlashcardSession';

  /**
   * W18-C6：通知中心页（历史通知列表 + 筛选 + 操作）。
   */
  static readonly NOTIFICATION_CENTER: string = 'notification-center';
  static readonly NOTIFICATION_CENTER_URL: string = 'pages/NotificationCenter';

  /**
   * W19-C1：反馈表单页（提交后跳 TicketDetail）。
   */
  static readonly FEEDBACK: string = 'Feedback';
  static readonly FEEDBACK_URL: string = 'pages/Feedback';

  /**
   * W19-C2：工单列表页（auth required）。
   */
  static readonly TICKET_LIST: string = 'TicketList';
  static readonly TICKET_LIST_URL: string = 'pages/TicketList';

  /**
   * W19-C2：工单详情页（聊天时间线 + 追问 + 关闭 + 评分）。
   */
  static readonly TICKET_DETAIL: string = 'TicketDetail';
  static readonly TICKET_DETAIL_URL: string = 'pages/TicketDetail';

  /**
   * W17-C5：订阅管理页（auth required）。
   */
  static readonly SUBSCRIPTIONS: string = 'Subscriptions';
  static readonly SUBSCRIPTIONS_URL: string = 'pages/Subscriptions';

  /**
   * W17-C6：退款申请流程页（auth required）。
   */
  static readonly REFUND_FLOW: string = 'RefundFlow';
  static readonly REFUND_FLOW_URL: string = 'pages/RefundFlow';

  /**
   * W19-C3：常见问题（FAQ）页。
   */
  static readonly FAQ: string = 'Faq';
  static readonly FAQ_URL: string = 'pages/Faq';

  /**
   * W19-C4：关于页（版本号、公司、ICP）。
   */
  static readonly ABOUT: string = 'About';
  static readonly ABOUT_URL: string = 'pages/About';

  /**
   * W19-C5：用户协议 / 隐私政策 / 第三方开源声明 / 联系我们。
   */
  static readonly USER_AGREEMENT: string = 'UserAgreement';
  static readonly USER_AGREEMENT_URL: string = 'pages/UserAgreement';
  static readonly PRIVACY_POLICY: string = 'PrivacyPolicy';
  static readonly PRIVACY_POLICY_URL: string = 'pages/PrivacyPolicy';
  static readonly OSS_LICENSES: string = 'OssLicenses';
  static readonly OSS_LICENSES_URL: string = 'pages/OssLicenses';
  static readonly CONTACT: string = 'Contact';
  static readonly CONTACT_URL: string = 'pages/Contact';
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
  static readonly VOCAB_STATS: string = 'pages/VocabStats';
  static readonly WEAKNESS_ANALYSIS: string = 'pages/WeaknessAnalysis';
  static readonly WORD_ASSOCIATION: string = 'pages/WordAssociation';
  static readonly WORD_FAMILY: string = 'pages/WordFamily';
  static readonly STUDY_PLAN: string = 'pages/StudyPlan';
  static readonly READING_COMPREHENSION: string = 'pages/ReadingComprehension';
  static readonly VOCAB: string = 'pages/Vocab';
  static readonly FLASHCARD_SESSION: string = 'pages/FlashcardSession';
  static readonly FEEDBACK: string = 'pages/Feedback';
  static readonly TICKET_LIST: string = 'pages/TicketList';
  static readonly TICKET_DETAIL: string = 'pages/TicketDetail';
  static readonly NOTIFICATION_CENTER: string = 'pages/NotificationCenter';
  static readonly SUBSCRIPTIONS: string = 'pages/Subscriptions';
  static readonly REFUND_FLOW: string = 'pages/RefundFlow';
  static readonly FAQ: string = 'pages/Faq';
  static readonly ABOUT: string = 'pages/About';
  static readonly USER_AGREEMENT: string = 'pages/UserAgreement';
  static readonly PRIVACY_POLICY: string = 'pages/PrivacyPolicy';
  static readonly OSS_LICENSES: string = 'pages/OssLicenses';
  static readonly CONTACT: string = 'pages/Contact';
}

/** 需要登录态才能进的路由（router auth-guard 使用）。 */
export const AUTH_REQUIRED_ROUTES: ReadonlySet<string> = new Set<string>([
  RoutePath.LIBRARY,
  RoutePath.READER,
  RoutePath.ME,
  RoutePath.NOTES,
  RoutePath.AUDIOBOOK_PLAYER,
  RoutePath.VOCAB,
  RoutePath.FLASHCARD_SESSION,
  RoutePath.TICKET_LIST,
  RoutePath.TICKET_DETAIL,
  RoutePath.SUBSCRIPTIONS,
  RoutePath.REFUND_FLOW,
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

export interface ComprehensionRouteParams {
  bookId: string;
  chapterIndex: number;
}

export interface StudyPlanRouteParams {}

export interface MeRouteParams {}
export interface LibraryRouteParams {}
export interface AudiobookTabRouteParams {}
export interface NativeDemoRouteParams {}

/** Deep link 解析结果。 */
export interface DeepLinkTarget {
  route: string;
  params: object | null;
}

// ---- W19-C1+C2 反馈 / 工单 ----

export interface FeedbackRouteParams {
  /** 预填类别（从 paywall / reader 等触发时可指定） */
  category?: string;
  /** 触发反馈时所在路由（自动附加，用户可勾去） */
  fromRoute?: string;
}

export interface TicketListRouteParams {}

export interface TicketDetailRouteParams {
  ticketId: string;
}
