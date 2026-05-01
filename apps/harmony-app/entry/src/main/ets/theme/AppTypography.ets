/**
 * 字号 / 行高 / 字重 token。
 * 阅读器专用字号阶（reader*）由 SettingsStore 控制可调，UI 字号阶不可调。
 */
export class AppFontSize {
  static readonly xs: number = 11;
  static readonly sm: number = 13;
  static readonly base: number = 15;
  static readonly md: number = 17;
  static readonly lg: number = 20;
  static readonly xl: number = 24;
  static readonly xxl: number = 28;
  static readonly title: number = 32;

  // 阅读器（用户可调）
  static readonly readerSmall: number = 14;
  static readonly readerNormal: number = 17;
  static readonly readerLarge: number = 20;
  static readonly readerXLarge: number = 24;
}

export class AppLineHeight {
  static readonly tight: number = 1.2;
  static readonly normal: number = 1.5;
  static readonly relaxed: number = 1.75;
  static readonly loose: number = 2.0;
}

export class AppFontWeight {
  static readonly regular: number = FontWeight.Regular;
  static readonly medium: number = FontWeight.Medium;
  static readonly bold: number = FontWeight.Bold;
}
