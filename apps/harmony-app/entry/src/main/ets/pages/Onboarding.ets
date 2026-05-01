import { AppColors } from '../theme/AppColors';
import { AppFontSize, AppFontWeight } from '../theme/AppTypography';
import { AppSpacing, AppRadius } from '../theme/AppSpacing';
import { RouterService } from '../router/RouterService';

@Component
export struct Onboarding {
  build() {
    NavDestination() {
      Column({ space: AppSpacing.lg }) {
        Text($r('app.string.onboarding_welcome'))
          .fontSize(AppFontSize.title)
          .fontWeight(AppFontWeight.bold)
          .fontColor(AppColors.textPrimary)

        Text($r('app.string.onboarding_subtitle'))
          .fontSize(AppFontSize.md)
          .fontColor(AppColors.textSecondary)
          .textAlign(TextAlign.Center)

        Button($r('app.string.onboarding_start'))
          .width(200)
          .height(48)
          .backgroundColor(AppColors.brand)
          .borderRadius(AppRadius.base)
          .onClick(() => RouterService.popToRoot())
      }
      .width('100%')
      .height('100%')
      .justifyContent(FlexAlign.Center)
      .alignItems(HorizontalAlign.Center)
      .padding(AppSpacing.lg)
      .backgroundColor(AppColors.bgPrimary)
    }
    .hideTitleBar(true)
  }
}
