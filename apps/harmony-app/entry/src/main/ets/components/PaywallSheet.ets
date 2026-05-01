import { AppColors } from '../theme/AppColors';
import { AppFontSize, AppFontWeight } from '../theme/AppTypography';
import { AppSpacing, AppRadius } from '../theme/AppSpacing';
import { IAPService, IAP_PRODUCTS, IapProduct } from '../service/IAPService';
import promptAction from '@ohos.promptAction';

@CustomDialog
export struct PaywallSheet {
  controller?: CustomDialogController;
  onPurchaseSuccess?: () => void;
  @State purchasing: boolean = false;
  @State selected: number = 1; // 默认选中年订阅

  private async onConfirm(): Promise<void> {
    if (this.purchasing) return;
    this.purchasing = true;
    const product = IAP_PRODUCTS[this.selected];
    const result = await IAPService.purchase(product);
    this.purchasing = false;
    if (result.success) {
      promptAction.showToast({ message: '订阅成功' });
      this.controller?.close();
      this.onPurchaseSuccess?.();
    } else {
      promptAction.showToast({ message: result.errorMessage ?? '购买失败' });
    }
  }

  @Builder
  productCard(p: IapProduct, idx: number) {
    Column({ space: AppSpacing.xs }) {
      Row() {
        Text(p.title)
          .fontSize(AppFontSize.md)
          .fontWeight(AppFontWeight.medium)
          .fontColor(AppColors.textPrimary)
          .layoutWeight(1)
        Text(p.priceCny)
          .fontSize(AppFontSize.lg)
          .fontWeight(AppFontWeight.bold)
          .fontColor(AppColors.brand)
      }
      .width('100%')
      Text(p.desc)
        .fontSize(AppFontSize.sm)
        .fontColor(AppColors.textSecondary)
        .width('100%')
    }
    .padding(AppSpacing.base)
    .borderRadius(AppRadius.md)
    .border({
      width: this.selected === idx ? 2 : 1,
      color: this.selected === idx ? AppColors.brand : AppColors.border,
    })
    .backgroundColor(this.selected === idx ? AppColors.bgElevated : AppColors.bgPrimary)
    .onClick(() => { this.selected = idx; })
  }

  build() {
    Column({ space: AppSpacing.base }) {
      Text('升级 Pro')
        .fontSize(AppFontSize.xl)
        .fontWeight(AppFontWeight.bold)
        .fontColor(AppColors.textPrimary)
        .padding({ top: AppSpacing.lg })

      Text('解锁全部图书与 AI 学习功能')
        .fontSize(AppFontSize.sm)
        .fontColor(AppColors.textSecondary)

      ForEach(IAP_PRODUCTS, (p: IapProduct, idx?: number) => {
        this.productCard(p, idx ?? 0)
      })

      Button(this.purchasing ? '处理中...' : '立即订阅')
        .width('100%')
        .height(48)
        .backgroundColor(AppColors.brand)
        .fontColor(AppColors.textInverse)
        .borderRadius(AppRadius.base)
        .enabled(!this.purchasing)
        .onClick(() => this.onConfirm())

      Text('取消')
        .fontSize(AppFontSize.sm)
        .fontColor(AppColors.textSecondary)
        .padding(AppSpacing.sm)
        .onClick(() => this.controller?.close())
    }
    .padding(AppSpacing.lg)
    .backgroundColor(AppColors.bgPrimary)
    .width('100%')
    .borderRadius({ topLeft: AppRadius.xl, topRight: AppRadius.xl })
  }
}
