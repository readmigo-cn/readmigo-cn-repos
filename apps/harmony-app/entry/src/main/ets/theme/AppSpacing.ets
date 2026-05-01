/**
 * 间距 / 圆角 / 阴影 token。
 * 间距阶基于 4 的倍数。
 */
export class AppSpacing {
  static readonly xs: number = 4;
  static readonly sm: number = 8;
  static readonly md: number = 12;
  static readonly base: number = 16;
  static readonly lg: number = 24;
  static readonly xl: number = 32;
  static readonly xxl: number = 48;
}

export class AppRadius {
  static readonly sm: number = 4;
  static readonly base: number = 8;
  static readonly md: number = 12;
  static readonly lg: number = 16;
  static readonly xl: number = 24;
  static readonly round: number = 999;
}

export class AppShadow {
  static readonly cardOptions: ShadowOptions = {
    radius: 8,
    color: '#1F000000',
    offsetX: 0,
    offsetY: 2,
  };

  static readonly modalOptions: ShadowOptions = {
    radius: 24,
    color: '#33000000',
    offsetX: 0,
    offsetY: 8,
  };
}
