import { AppColors } from '../theme/AppColors';
import { AppFontSize, AppFontWeight } from '../theme/AppTypography';
import { AppSpacing, AppRadius } from '../theme/AppSpacing';
import { UserStore, UserProfile } from '../store/UserStore';
import { RouterService } from '../router/RouterService';
import { RoutePath } from '../router/RouteConstants';

@Component
export struct Me {
  @State profile: UserProfile | null = null;

  aboutToAppear(): void {
    this.profile = UserStore.getProfile() ?? null;
  }

  private onLogout(): void {
    UserStore.clear();
    RouterService.push(RoutePath.LOGIN);
  }

  build() {
    Column({ space: AppSpacing.lg }) {
      Text($r('app.string.me_title'))
        .fontSize(AppFontSize.xl)
        .fontWeight(AppFontWeight.bold)
        .fontColor(AppColors.textPrimary)
        .padding(AppSpacing.base)
        .width('100%')
        .textAlign(TextAlign.Start)

      Row({ space: AppSpacing.base }) {
        Image(this.profile?.avatarUrl ?? $r('app.media.app_icon'))
          .width(64).height(64).borderRadius(AppRadius.round)
        Column({ space: AppSpacing.xs }) {
          Text(this.profile?.nickname ?? '未登录')
            .fontSize(AppFontSize.md)
            .fontColor(AppColors.textPrimary)
          Text(this.profile?.phone ?? '')
            .fontSize(AppFontSize.sm)
            .fontColor(AppColors.textSecondary)
        }
        .alignItems(HorizontalAlign.Start)
      }
      .width('100%')
      .padding(AppSpacing.base)

      Button($r('app.string.me_logout'))
        .width('90%')
        .height(48)
        .fontColor(AppColors.danger)
        .backgroundColor(AppColors.bgSecondary)
        .borderRadius(AppRadius.base)
        .onClick(() => this.onLogout())
    }
    .width('100%')
    .height('100%')
    .alignItems(HorizontalAlign.Center)
    .backgroundColor(AppColors.bgPrimary)
  }
}
