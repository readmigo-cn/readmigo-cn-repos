import { AppColors } from '../theme/AppColors';
import { AppFontSize, AppFontWeight } from '../theme/AppTypography';
import { AppSpacing } from '../theme/AppSpacing';

@Component
export struct Discover {
  build() {
    Column({ space: AppSpacing.lg }) {
      Text($r('app.string.discover_title'))
        .fontSize(AppFontSize.xl)
        .fontWeight(AppFontWeight.bold)
        .fontColor(AppColors.textPrimary)
        .padding(AppSpacing.base)
        .width('100%')
        .textAlign(TextAlign.Start)

      Text($r('app.string.discover_recommend'))
        .fontSize(AppFontSize.md)
        .fontColor(AppColors.textSecondary)
        .padding({ left: AppSpacing.base })

      Text($r('app.string.common_empty'))
        .fontSize(AppFontSize.sm)
        .fontColor(AppColors.textTertiary)
        .padding(AppSpacing.base)
    }
    .width('100%')
    .height('100%')
    .alignItems(HorizontalAlign.Start)
    .backgroundColor(AppColors.bgPrimary)
  }
}
