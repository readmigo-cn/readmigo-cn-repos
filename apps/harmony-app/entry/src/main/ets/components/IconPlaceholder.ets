/**
 * Icon 占位组件 - 用于开发期间替代缺失的媒体资源
 * 功能：在资源文件添加前使用系统图标或文字占位
 */

// 图标名称映射
export type IconName = 
  | 'search' | 'close' | 'edit' | 'delete' | 'logout' | 'settings'
  | 'language' | 'email' | 'person' | 'crown' | 'bar_chart' | 'timer'
  | 'book' | 'fire' | 'notifications' | 'wifi' | 'sync' | 'help'
  | 'check' | 'more_vert' | 'play_arrow' | 'pause' | 'skip_previous'
  | 'skip_next' | 'volume_up' | 'list' | 'bookmark' | 'highlight'
  | 'headset' | 'mic' | 'chevron_left' | 'chevron_right' | 'chevron_down'
  | 'arrow_back' | 'bedtime' | 'text_fields';

@Component
export struct IconPlaceholder {
  @Prop name: IconName = 'search';
  @Prop size: number = 24;
  @Prop color: string = '#666666';

  // 图标文字映射（开发期间使用）
  private iconMap: Record<IconName, string> = {
    'search': '🔍',
    'close': '✕',
    'edit': '✎',
    'delete': '🗑',
    'logout': '⇄',
    'settings': '⚙',
    'language': '文',
    'email': '✉',
    'person': '👤',
    'crown': '👑',
    'bar_chart': '📊',
    'timer': '⏱',
    'book': '📖',
    'fire': '🔥',
    'notifications': '🔔',
    'wifi': '📶',
    'sync': '🔄',
    'help': '?',
    'check': '✓',
    'more_vert': '⋮',
    'play_arrow': '▶',
    'pause': '⏸',
    'skip_previous': '⏮',
    'skip_next': '⏭',
    'volume_up': '🔊',
    'list': '☰',
    'bookmark': '📑',
    'highlight': '🖍',
    'headset': '🎧',
    'mic': '🎤',
    'chevron_left': '‹',
    'chevron_right': '›',
    'chevron_down': '˅',
    'arrow_back': '←',
    'bedtime': '🌙',
    'text_fields': 'T'
  };

  build() {
    Text(this.iconMap[this.name] || '?')
      .fontSize(this.size)
      .fontColor(this.color)
      .fontWeight(FontWeight.Normal)
      .lineHeight(this.size)
      .textAlign(TextAlign.Center)
  }
}

// 简化版本：只用文字
@Component
export struct SimpleIcon {
  @Prop name: IconName = 'search';
  @Prop size: number = 20;
  @Prop color: string = '#666666';

  build() {
    Text(this.getIconChar(this.name))
      .fontSize(this.size)
      .fontColor(this.color)
  }

  private getIconChar(name: IconName): string {
    const chars: Record<IconName, string> = {
      'search': '🔍', 'close': '✕', 'edit': '✎', 'delete': '🗑',
      'logout': '⇄', 'settings': '⚙', 'language': '文', 'email': '✉',
      'person': '👤', 'crown': '👑', 'bar_chart': '📊', 'timer': '⏱',
      'book': '📖', 'fire': '🔥', 'notifications': '🔔', 'wifi': '📶',
      'sync': '🔄', 'help': '?', 'check': '✓', 'more_vert': '⋮',
      'play_arrow': '▶', 'pause': '⏸', 'skip_previous': '⏮',
      'skip_next': '⏭', 'volume_up': '🔊', 'list': '☰',
      'bookmark': '📑', 'highlight': '🖍', 'headset': '🎧',
      'mic': '🎤', 'chevron_left': '‹', 'chevron_right': '›',
      'chevron_down': '˅', 'arrow_back': '←', 'bedtime': '🌙',
      'text_fields': 'T'
    };
    return chars[name] || '•';
  }
}
