import { AppColors } from '../theme/AppColors';
import { AppFontSize, AppFontWeight } from '../theme/AppTypography';
import { AppSpacing, AppRadius } from '../theme/AppSpacing';
import { RouterService } from '../router/RouterService';
import { UserStore } from '../store/UserStore';
import { AuthApi } from '../service/api/AuthApi';
import { ApiError } from '../service/HttpClient';
import promptAction from '@ohos.promptAction';

@Component
export struct Login {
  @State phone: string = '';
  @State code: string = '';
  @State sending: boolean = false;
  @State submitting: boolean = false;
  @State countdown: number = 0;
  private timer: number = -1;

  aboutToDisappear(): void {
    if (this.timer >= 0) {
      clearInterval(this.timer);
    }
  }

  private startCountdown(): void {
    this.countdown = 60;
    this.timer = setInterval(() => {
      this.countdown -= 1;
      if (this.countdown <= 0) {
        clearInterval(this.timer);
        this.timer = -1;
      }
    }, 1000) as number;
  }

  private async onSendCode(): Promise<void> {
    if (this.phone.length < 11 || this.sending) return;
    this.sending = true;
    try {
      await AuthApi.sendSmsCode(this.phone);
      this.startCountdown();
      promptAction.showToast({ message: '验证码已发送' });
    } catch (err) {
      const e = err as ApiError;
      promptAction.showToast({ message: e.message ?? '发送失败' });
    } finally {
      this.sending = false;
    }
  }

  private async onSubmit(): Promise<void> {
    if (this.phone.length < 11 || this.code.length < 4 || this.submitting) return;
    this.submitting = true;
    try {
      const res = await AuthApi.loginByCode(this.phone, this.code);
      UserStore.setToken(res.token, res.refreshToken);
      RouterService.popToRoot();
    } catch (err) {
      const e = err as ApiError;
      promptAction.showToast({ message: e.message ?? '登录失败' });
    } finally {
      this.submitting = false;
    }
  }

  build() {
    NavDestination() {
      Column({ space: AppSpacing.lg }) {
        Text($r('app.string.app_name'))
          .fontSize(AppFontSize.title)
          .fontWeight(AppFontWeight.bold)
          .fontColor(AppColors.textPrimary)
          .margin({ top: AppSpacing.xxl })

        Text($r('app.string.login_title'))
          .fontSize(AppFontSize.lg)
          .fontColor(AppColors.textSecondary)

        TextInput({ placeholder: $r('app.string.login_phone_placeholder'), text: this.phone })
          .type(InputType.PhoneNumber)
          .maxLength(11)
          .height(48)
          .padding(AppSpacing.base)
          .backgroundColor(AppColors.bgSecondary)
          .borderRadius(AppRadius.base)
          .onChange((v: string) => { this.phone = v; })

        Row({ space: AppSpacing.sm }) {
          TextInput({ placeholder: $r('app.string.login_code_placeholder'), text: this.code })
            .type(InputType.Number)
            .maxLength(6)
            .height(48)
            .layoutWeight(1)
            .padding(AppSpacing.base)
            .backgroundColor(AppColors.bgSecondary)
            .borderRadius(AppRadius.base)
            .onChange((v: string) => { this.code = v; })

          Button(this.countdown > 0 ? `${this.countdown}s` : $r('app.string.login_send_code'))
            .height(48)
            .width(120)
            .fontSize(AppFontSize.sm)
            .backgroundColor(AppColors.brand)
            .enabled(this.countdown === 0 && this.phone.length >= 11)
            .onClick(() => this.onSendCode())
        }
        .width('100%')

        Button($r('app.string.login_submit'))
          .width('100%')
          .height(48)
          .fontSize(AppFontSize.md)
          .backgroundColor(AppColors.brand)
          .borderRadius(AppRadius.base)
          .enabled(this.phone.length >= 11 && this.code.length >= 4 && !this.submitting)
          .onClick(() => this.onSubmit())

        Button($r('app.string.login_huawei'))
          .width('100%')
          .height(48)
          .fontSize(AppFontSize.md)
          .fontColor(AppColors.textPrimary)
          .backgroundColor(AppColors.bgSecondary)
          .borderRadius(AppRadius.base)
          .onClick(() => promptAction.showToast({ message: 'HMS Account Kit 接入待 Phase 4' }))
      }
      .width('100%')
      .height('100%')
      .padding(AppSpacing.lg)
      .backgroundColor(AppColors.bgPrimary)
    }
    .hideTitleBar(true)
  }
}
