import { SimpleIcon } from '../components/IconPlaceholder';

/**
 * Me Page - User profile, settings, and purchases
 * 功能对齐：web/src/app/(main)/settings/settings-content.tsx + profile-edit-section.tsx
 * 
 * Features (aligned with overseas):
 * - User profile editing (avatar, name, bio)
 * - Language selection (25+ languages)
 * - Subscription management (Pro / Free tier)
 * - Account settings (email, sign out, delete account)
 * - Offline downloads settings
 * - Reading statistics
 * - Help & About
 * - Version info
 * 
 * Domestic Integration:
 * - Huawei Account Kit integration
 * - HMS IAP for subscriptions
 * - Domestic language options (simplified/traditional Chinese priority)
 */
@Entry
@Component
struct Me {
  @State isAuthenticated: boolean = false;
  @State isLoading: boolean = true;
  
  // User profile
  @State avatar: string = '';
  @State nickname: string = '';
  @State email: string = '';
  @State bio: string = '';
  @State isPro: boolean = false;
  
  // Settings
  @State currentLanguage: string = 'zh';
  @State notifications: boolean = true;
  @State wifiOnlyDownload: boolean = true;
  @State autoSyncProgress: boolean = true;
  
  // Reading stats
  @State totalReadingTime: number = 0; // minutes
  @State booksFinished: number = 0;
  @State currentStreak: number = 0; // days
  
  // UI state
  @State showProfileEdit: boolean = false;
  @State showLanguagePicker: boolean = false;
  @State showDeleteAccountConfirm: boolean = false;
  @State deleteConfirmText: string = '';
  @State isDeleting: boolean = false;
  
  aboutToAppear() {
    this.loadUserData();
  }

  async loadUserData() {
    try {
      // TODO: Get user data from auth store / API
      // const user = await UserApi.getProfile();
      // this.avatar = user.avatar;
      // this.nickname = user.nickname;
      // this.email = user.email;
      // this.isPro = user.isPro;
      
      // Mock data for now
      this.isAuthenticated = true;
      this.nickname = 'Demo User';
      this.email = 'user@example.com';
      this.isPro = false;
      this.totalReadingTime = 320;
      this.booksFinished = 5;
      this.currentStreak = 3;
    } catch (error) {
      console.error('Failed to load user data', error);
    } finally {
      this.isLoading = false;
    }
  }

  async handleSignOut() {
    try {
      // TODO: Call auth API to sign out
      // await AuthApi.signOut();
      this.isAuthenticated = false;
    } catch (error) {
      console.error('Sign out failed', error);
    }
  }

  async handleDeleteAccount() {
    if (this.deleteConfirmText !== 'DELETE') return;
    
    this.isDeleting = true;
    try {
      // TODO: Call API to delete account
      // await UserApi.deleteAccount();
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.isAuthenticated = false;
    } catch (error) {
      console.error('Delete account failed', error);
    } finally {
      this.isDeleting = false;
      this.showDeleteAccountConfirm = false;
    }
  }

  build() {
    if (this.isLoading) {
      this.LoadingView()
    } else if (!this.isAuthenticated) {
      this.GuestView()
    } else {
      this.SettingsView()
    }
  }

  @Builder LoadingView() {
    Column({ space: 16 }) {
      LoadingProgress()
      Text('加载中...')
        .fontSize(14)
        .fontColor('#999999')
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
  }

  @Builder GuestView() {
    Scroll() {
      Column({ space: 24 }) {
        // Login prompt
        Column({ space: 16 }) {
          // Avatar placeholder
          Stack() {
            Circle()
              .width(100)
              .height(100)
              .fill('#f5f5f5')
            SimpleIcon({ name: 'person', size: 50, color: '#cccccc' })
          }

          Text('未登录')
            .fontSize(20)
            .fontWeight(FontWeight.SemiBold)

          Text('登录后即可同步阅读进度和藏书')
            .fontSize(14)
            .fontColor('#999999')

          Button('立即登录')
            .width('50%')
            .margin({ top: 16 })
            .onClick(() => {
              // TODO: Navigate to login
              console.info('Navigate to login');
            })
        }
        .padding(40)
      }
      .width('100%')
      .padding(24)
    }
    .backgroundColor('#FFFDF9')
  }

  @Builder SettingsView() {
    Scroll() {
      Column({ space: 20 }) {
        // User Profile Header
        this.ProfileHeader()

        // Reading Stats Card
        this.ReadingStatsCard()

        // Subscription Card
        this.SubscriptionCard()

        // Account Settings
        this.AccountSettingsCard()

        // App Settings
        this.AppSettingsCard()

        // Help & About
        this.HelpCard()

        // Version Info
        this.VersionInfo()

        // Bottom padding
        Divider().height(40).backgroundColor(Color.Transparent)
      }
      .width('100%')
      .padding(16)
    }
    .backgroundColor('#FFFDF9')

    // Delete account confirmation dialog
    if (this.showDeleteAccountConfirm) {
      this.DeleteAccountDialog()
    }
  }

  @Builder ProfileHeader() {
    Stack() {
      // Background gradient
      Column()
        .width('100%')
        .height(180)
        .linearGradient({
          angle: 135,
          colors: [['#4CAF50', 0], ['#8BC34A', 1]]
        })
        .borderRadius(20)

      // Profile content
      Column({ space: 12 }) {
        Row() {
          // Avatar
          Stack() {
            if (this.avatar) {
              Image(this.avatar)
                .width(80)
                .height(80)
                .borderRadius(40)
                .border({ width: 3, color: Color.White })
            } else {
              Stack() {
                Circle()
                  .width(80)
                  .height(80)
                  .fill('#ffffff')
                SimpleIcon({ name: 'person', size: 40, color: '#cccccc' })
              }
            }

            // Edit button
            Button() {
              SimpleIcon({ name: 'edit', size: 16, color: Color.White })
            }
            .width(28)
            .height(28)
            .borderRadius(14)
            .backgroundColor('#4CAF50')
            .position({ right: 0, bottom: 0 })
            .onClick(() => { this.showProfileEdit = true; })
          }

          // Pro badge
          if (this.isPro) {
            Badge()
              .backgroundColor('#ffd700')
              .borderRadius(8)
              .padding({ left: 8, right: 8, top: 4, bottom: 4 })
              .contentRow() {
                SimpleIcon({ name: 'crown', size: 14, color: '#000000' })
                Text('Pro')
                  .fontSize(12)
                  .fontWeight(FontWeight.Bold)
                  .fontColor('#000000')
              }
              .margin({ left: 12, top: 8 })
          }
        }

        // Nickname
        Text(this.nickname)
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
          .fontColor(Color.White)
          .margin({ top: 12 })

        // Email
        Text(this.email)
          .fontSize(14)
          .fontColor('#ffffffcc')
      }
      .width('100%')
      .padding(20)
    }
    .width('100%')
    .height(180)
  }

  @Builder ReadingStatsCard() {
    Column({ space: 12 }) {
      // Header
      Row() {
        Image(SimpleIcon({ name: 'bar_chart', size: 20, color: '#4CAF50' }))
          .width(20)
          .height(20)
          .fillColor('#4CAF50')
        Text('阅读统计')
          .fontSize(16)
          .fontWeight(FontWeight.SemiBold)
          .margin({ left: 8 })
          .layoutWeight(1)
      }
      .width('100%')

      // Stats grid
      Grid() {
        GridItem() { this.StatItem('阅读时长', `${this.totalReadingTime} 分钟`, SimpleIcon({ name: 'timer', size: 24, color: '#4CAF50' })) }
        GridItem() { this.StatItem('已读完', `${this.booksFinished} 本`, SimpleIcon({ name: 'book', size: 24, color: '#4CAF50' })) }
        GridItem() { this.StatItem('连续打卡', `${this.currentStreak} 天`, SimpleIcon({ name: 'fire', size: 24, color: '#4CAF50' })) }
      }
      .columnsTemplate('1fr 1fr 1fr')
      .width('100%')
    }
    .padding(16)
    .backgroundColor(Color.White)
    .borderRadius(16)
    .shadow({ radius: 4, color: '#10101010', offsetY: 2 })
  }

  @Builder StatItem(label: string, value: string, icon: Resource) {
    Column({ space: 8 }) {
      Image(icon)
        .width(24)
        .height(24)
        .fillColor('#4CAF50')
      Text(value)
        .fontSize(18)
        .fontWeight(FontWeight.Bold)
        .fontColor('#1a1a1a')
      Text(label)
        .fontSize(12)
        .fontColor('#999999')
    }
  }

  @Builder SubscriptionCard() {
    Column({ space: 12 }) {
      // Header
      Row() {
        Image(SimpleIcon({ name: 'crown', size: 20, color: '#8b5cf6' }))
          .width(20)
          .height(20)
          .fillColor('#8b5cf6')
        Text('会员服务')
          .fontSize(16)
          .fontWeight(FontWeight.SemiBold)
          .margin({ left: 8 })
          .layoutWeight(1)
      }
      .width('100%')

      // Subscription status
      Row() {
        Column({ space: 4 }) {
          if (this.isPro) {
            Badge()
              .backgroundColor('#8b5cf6')
              .contentRow() {
                Text('Pro 会员')
                  .fontSize(12)
                  .fontWeight(FontWeight.Bold)
                  .fontColor(Color.White)
              }
          } else {
            Text('免费版')
              .fontSize(14)
              .fontColor('#666666')
          }
        }
        .alignItems(HorizontalAlign.Start)

        Button(this.isPro ? '管理订阅' : '升级 Pro')
          .fontSize(14)
          .backgroundColor(this.isPro ? '#f5f5f5' : '#8b5cf6')
          .fontColor(this.isPro ? '#1a1a1a' : Color.White)
          .onClick(() => {
            // TODO: Navigate to subscription management
            console.info('Navigate to subscription');
          })
      }
      .width('100%')

      // Pro benefits preview
      if (!this.isPro) {
        Column({ space: 8 }) {
          BenefitItem('无限 AI 翻译次数')
          BenefitItem('高级 TTS 语音朗读')
          BenefitItem('阅读统计详细分析')
          BenefitItem('云端同步无限制')
        }
        .width('100%')
        .padding(12)
        .backgroundColor('#f5f5f5')
        .borderRadius(12)
      }
    }
    .padding(16)
    .backgroundColor(Color.White)
    .borderRadius(16)
    .shadow({ radius: 4, color: '#10101010', offsetY: 2 })
  }

  @Builder AccountSettingsCard() {
    Column({ space: 0 }) {
      // Header
      Row() {
        Image(SimpleIcon({ name: 'person', size: 20, color: '#4CAF50' }))
          .width(20)
          .height(20)
          .fillColor('#4CAF50')
        Text('账户设置')
          .fontSize(16)
          .fontWeight(FontWeight.SemiBold)
          .margin({ left: 8 })
      }
      .width('100%')
      .padding({ bottom: 12 })

      // Settings items
      SettingsItem({
        icon: SimpleIcon({ name: 'language', size: 20, color: '#4CAF50' }),
        title: '语言',
        value: this.getLanguageName(this.currentLanguage),
        onClick: () => { this.showLanguagePicker = true; }
      })

      Divider().height(1).backgroundColor('#f5f5f5')

      SettingsItem({
        icon: SimpleIcon({ name: 'email', size: 20, color: '#4CAF50' }),
        title: '邮箱',
        value: this.email,
        showChevron: false
      })

      Divider().height(1).backgroundColor('#f5f5f5')

      SettingsItem({
        icon: SimpleIcon({ name: 'logout', size: 20, color: '#666666' }),
        title: '退出登录',
        titleColor: '#666666',
        onClick: () => { this.handleSignOut(); }
      })

      Divider().height(1).backgroundColor('#f5f5f5')

      SettingsItem({
        icon: SimpleIcon({ name: 'delete', size: 20, color: '#f44336' }),
        title: '注销账户',
        titleColor: '#f44336',
        onClick: () => { this.showDeleteAccountConfirm = true; }
      })
    }
    .padding(16)
    .backgroundColor(Color.White)
    .borderRadius(16)
    .shadow({ radius: 4, color: '#10101010', offsetY: 2 })
  }

  @Builder AppSettingsCard() {
    Column({ space: 0 }) {
      // Header
      Row() {
        Image(SimpleIcon({ name: 'settings', size: 20, color: '#4CAF50' }))
          .width(20)
          .height(20)
          .fillColor('#4CAF50')
        Text('应用设置')
          .fontSize(16)
          .fontWeight(FontWeight.SemiBold)
          .margin({ left: 8 })
      }
      .width('100%')
      .padding({ bottom: 12 })

      // Toggle settings
      ToggleSettingItem({
        icon: $r('app.media.notifications),
        title: '消息通知',
        checked: this.notifications,
        onChange: (checked: boolean) => { this.notifications = checked; }
      })

      Divider().height(1).backgroundColor('#f5f5f5')

      ToggleSettingItem({
        icon: $r('app.media.wifi),
        title: '仅 Wi-Fi 下载',
        checked: this.wifiOnlyDownload,
        onChange: (checked: boolean) => { this.wifiOnlyDownload = checked; }
      })

      Divider().height(1).backgroundColor('#f5f5f5')

      ToggleSettingItem({
        icon: $r('app.media.sync),
        title: '自动同步进度',
        checked: this.autoSyncProgress,
        onChange: (checked: boolean) => { this.autoSyncProgress = checked; }
      })
    }
    .padding(16)
    .backgroundColor(Color.White)
    .borderRadius(16)
    .shadow({ radius: 4, color: '#10101010', offsetY: 2 })
  }

  @Builder HelpCard() {
    Column({ space: 0 }) {
      // Header
      Row() {
        Image(SimpleIcon({ name: 'help', size: 20, color: '#4CAF50' }))
          .width(20)
          .height(20)
          .fillColor('#4CAF50')
        Text('帮助与关于')
          .fontSize(16)
          .fontWeight(FontWeight.SemiBold)
          .margin({ left: 8 })
      }
      .width('100%')
      .padding({ bottom: 12 })

      // Help items
      SettingsItem({
        icon: $r('app.media.help_center),
        title: '帮助中心',
        onClick: () => {
          // TODO: Open help center
        }
      })

      Divider().height(1).backgroundColor('#f5f5f5')

      SettingsItem({
        icon: $r('app.media.feedback),
        title: '意见反馈',
        onClick: () => {
          // TODO: Open feedback form
        }
      })

      Divider().height(1).backgroundColor('#f5f5f5')

      SettingsItem({
        icon: $r('app.media.info),
        title: '关于 Readmigo',
        onClick: () => {
          // TODO: Show about dialog
        }
      })
    }
    .padding(16)
    .backgroundColor(Color.White)
    .borderRadius(16)
    .shadow({ radius: 4, color: '#10101010', offsetY: 2 })
  }

  @Builder VersionInfo() {
    Column({ space: 4 }) {
      Text('Readmigo HarmonyOS v1.0.0')
        .fontSize(12)
        .fontColor('#999999')
      Text('© 2026 Readmigo. All rights reserved.')
        .fontSize(12)
        .fontColor('#999999')
    }
    .width('100%')
    .padding({ top: 20, bottom: 20 })
  }

  @Builder DeleteAccountDialog() {
    Column({ space: 20 }) {
      // Title
      Text('注销账户')
        .fontSize(18)
        .fontWeight(FontWeight.SemiBold)

      // Description
      Text('此操作不可逆，账户数据将被永久删除')
        .fontSize(14)
        .fontColor('#666666')
        .textAlign(TextAlign.Center)

      // Confirm input
      TextInput({ placeholder: '输入 DELETE 确认' })
        .width('100%')
        .backgroundColor('#f5f5f5')
        .borderRadius(8)
        .padding({ left: 12, right: 12, top: 10, bottom: 10 })
        .onChange((value: string) => { this.deleteConfirmText = value; })

      // Actions
      Row({ space: 12 }) {
        Button('取消')
          .fontSize(14)
          .backgroundColor('#f5f5f5')
          .fontColor('#666666')
          .onClick(() => {
            this.showDeleteAccountConfirm = false;
            this.deleteConfirmText = '';
          })

        Button('确认注销')
          .fontSize(14)
          .backgroundColor('#f44336')
          .fontColor(Color.White)
          .disabled(this.deleteConfirmText !== 'DELETE' || this.isDeleting)
          .onClick(() => { this.handleDeleteAccount(); })
      }
      .width('100%')
      .justifyContent(FlexAlign.End)
    }
    .width('100%')
    .padding(20)
    .backgroundColor(Color.White)
    .borderRadius(16)
    .position({ left: 0, right: 0, top: 0, bottom: 0 })
    .justifyContent(FlexAlign.Center)
    .backgroundColor('#00000066')
  }

  @Builder StatItem(label: string, value: string, icon: Resource) {
    Column({ space: 8 }) {
      Image(icon)
        .width(24)
        .height(24)
        .fillColor('#4CAF50')
      Text(value)
        .fontSize(18)
        .fontWeight(FontWeight.Bold)
      Text(label)
        .fontSize(12)
        .fontColor('#999999')
    }
  }

  getLanguageName(code: string): string {
    const languages: Record<string, string> = {
      'zh': '简体中文',
      'zh-Hant': '繁體中文',
      'en': 'English',
      'ja': '日本語',
      'ko': '한국어'
    };
    return languages[code] || code;
  }
}

// Badge Component
@Component
struct Badge {
  @Prop backgroundColor: string = '#f5f5f5';
  @Prop borderRadius: number = 8;

  build() {
    Row()
      .backgroundColor(this.backgroundColor)
      .borderRadius(this.borderRadius)
  }
}

// Settings Item Component
@Component
struct SettingsItem {
  @Prop icon: Resource = SimpleIcon({ name: 'settings', size: 20, color: '#4CAF50' });
  @Prop title: string = '';
  @Prop titleColor: string = '#1a1a1a';
  @Prop value: string = '';
  @Prop showChevron: boolean = true;
  @Prop onClick: () => void = () => {};

  build() {
    Row() {
      Row({ space: 12 }) {
        Image(this.icon)
          .width(20)
          .height(20)
          .fillColor('#4CAF50')
        Text(this.title)
          .fontSize(14)
          .fontColor(this.titleColor)
      }
      .layoutWeight(1)

      if (this.value) {
        Text(this.value)
          .fontSize(14)
          .fontColor('#999999')
          .margin({ right: 8 })
      }

      if (this.showChevron) {
        Image(SimpleIcon({ name: 'chevron_right', size: 16, color: '#cccccc' }))
          .width(16)
          .height(16)
          .fillColor('#cccccc')
      }
    }
    .width('100%')
    .padding({ top: 12, bottom: 12 })
    .onClick(this.onClick)
  }
}

// Toggle Setting Item Component
@Component
struct ToggleSettingItem {
  @Prop icon: Resource = SimpleIcon({ name: 'settings', size: 20, color: '#4CAF50' });
  @Prop title: string = '';
  @Prop checked: boolean = false;
  @Prop onChange: (checked: boolean) => void = () => {};

  build() {
    Row() {
      Row({ space: 12 }) {
        Image(this.icon)
          .width(20)
          .height(20)
          .fillColor('#4CAF50')
        Text(this.title)
          .fontSize(14)
          .fontColor('#1a1a1a')
      }
      .layoutWeight(1)

      Toggle({ checked: this.checked })
        .onChange((isChecked: boolean) => { this.onChange(isChecked); })
        .selectedColor('#4CAF50')
    }
    .width('100%')
    .padding({ top: 12, bottom: 12 })
  }
}

// Benefit Item Component
@Component
struct BenefitItem {
  @Prop text: string = '';

  build() {
    Row({ space: 8 }) {
      Image(SimpleIcon({ name: 'check', size: 16, color: '#8b5cf6' }))
        .width(16)
        .height(16)
        .fillColor('#8b5cf6')
      Text(this.text)
        .fontSize(13)
        .fontColor('#666666')
    }
  }
}

// Loading Progress Component
@Component
struct LoadingProgress {
  build() {
    LoadingProgress()
      .width(40)
      .height(40)
      .color('#4CAF50')
  }
}
