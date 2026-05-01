import { AppColors } from '../theme/AppColors';
import { AppFontSize, AppFontWeight } from '../theme/AppTypography';
import { AppSpacing } from '../theme/AppSpacing';
import { ReaderRouteParams } from '../router/RouteConstants';
import { RouterService } from '../router/RouterService';

/**
 * Reader page — 占位实现。
 * 真实渲染要等 W3-W4：napi-bridge typesetting.so + XComponent 直绘。
 * 这里只展示 bookId / chapterId，验证 NavPathStack 参数传递。
 */
@Component
export struct Reader {
  @Prop params: ReaderRouteParams;

  build() {
    NavDestination() {
      Column({ space: AppSpacing.base }) {
        Row() {
          Text('< ')
            .fontSize(AppFontSize.md)
            .fontColor(AppColors.brand)
            .onClick(() => RouterService.pop())
          Text('Reader')
            .fontSize(AppFontSize.md)
            .fontColor(AppColors.textPrimary)
        }
        .width('100%')
        .padding(AppSpacing.base)

        Text(`bookId: ${this.params?.bookId ?? '(none)'}`)
          .fontSize(AppFontSize.base)
          .fontColor(AppColors.textPrimary)

        Text(`chapterId: ${this.params?.chapterId ?? '(default)'}`)
          .fontSize(AppFontSize.base)
          .fontColor(AppColors.textSecondary)

        Text('XComponent + typesetting.so 渲染将在 Phase 1 W3 接入')
          .fontSize(AppFontSize.sm)
          .fontColor(AppColors.textTertiary)
          .padding(AppSpacing.base)
          .backgroundColor(AppColors.bgSecondary)
          .borderRadius(8)
      }
      .width('100%')
      .height('100%')
      .padding(AppSpacing.base)
      .backgroundColor(AppColors.bgReader)
    }
    .hideTitleBar(true)
  }
}
