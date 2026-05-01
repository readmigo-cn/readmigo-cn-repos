/**
 * 颜色 token，按语义命名。所有页面只引用这里，禁止硬编码 #xxxxxx。
 * 暗色模式由 resources/dark/element/color.json 接管，运行时自动切换。
 */
export class AppColors {
  // 品牌
  static readonly brand: string = '#2E7D32';
  static readonly brandLight: string = '#4CAF50';
  static readonly brandDark: string = '#1B5E20';

  // 文字
  static readonly textPrimary: string = '#1A1A1A';
  static readonly textSecondary: string = '#666666';
  static readonly textTertiary: string = '#999999';
  static readonly textInverse: string = '#FFFFFF';

  // 背景
  static readonly bgPrimary: string = '#FFFDF9';
  static readonly bgSecondary: string = '#F5F5F5';
  static readonly bgElevated: string = '#FFFFFF';
  static readonly bgReader: string = '#FBF7EE';

  // 边框 / 分隔
  static readonly border: string = '#E5E5E5';
  static readonly divider: string = '#EEEEEE';

  // 语义
  static readonly success: string = '#52C41A';
  static readonly warning: string = '#FAAD14';
  static readonly danger: string = '#FF4D4F';
  static readonly info: string = '#1890FF';

  // 阅读器特殊
  static readonly highlight: string = '#FFE58F';
  static readonly noteBg: string = '#FFF7E6';
}
