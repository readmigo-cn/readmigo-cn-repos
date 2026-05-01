import { RoutePath, ReaderRouteParams, AudiobookPlayerParams } from '../router/RouteConstants';
import { RouterService } from '../router/RouterService';
import { UserStore } from '../store/UserStore';
import { AppColors } from '../theme/AppColors';
import { Login } from './Login';
import { Onboarding } from './Onboarding';
import { Discover } from './Discover';
import { Library } from './Library';
import { Reader } from './Reader';
import { Me } from './Me';
import { AudiobookTab } from './AudiobookTab';
import { AudiobookPlayer } from './AudiobookPlayer';
import { Notes } from './Notes';

@Entry
@Component
struct Index {
  @State currentTab: number = 0;
  private navStack: NavPathStack = new NavPathStack();

  aboutToAppear(): void {
    RouterService.bind(this.navStack);
    if (!UserStore.isLoggedIn()) {
      this.navStack.pushPathByName(RoutePath.LOGIN, null);
    }
  }

  @Builder
  pageMap(name: string, param: object) {
    if (name === RoutePath.LOGIN) {
      Login();
    } else if (name === RoutePath.ONBOARDING) {
      Onboarding();
    } else if (name === RoutePath.READER) {
      Reader({ params: param as ReaderRouteParams });
    } else if (name === RoutePath.AUDIOBOOK_PLAYER) {
      AudiobookPlayer({ params: param as AudiobookPlayerParams });
    } else if (name === RoutePath.NOTES) {
      Notes();
    }
  }

  @Builder
  tabBuilder(index: number, labelRes: Resource, icon: Resource) {
    Column() {
      Image(icon)
        .width(24)
        .height(24)
        .fillColor(this.currentTab === index ? AppColors.brand : AppColors.textSecondary)
      Text(labelRes)
        .fontSize(11)
        .fontColor(this.currentTab === index ? AppColors.brand : AppColors.textSecondary)
        .margin({ top: 2 })
    }
    .width('100%')
    .height(56)
    .justifyContent(FlexAlign.Center)
  }

  build() {
    Navigation(this.navStack) {
      Tabs({ index: this.currentTab, barPosition: BarPosition.End }) {
        TabContent() {
          Discover()
        }.tabBar(this.tabBuilder(0, $r('app.string.tab_discover'), $r('app.media.app_icon')))

        TabContent() {
          Library()
        }.tabBar(this.tabBuilder(1, $r('app.string.tab_library'), $r('app.media.app_icon')))

        TabContent() {
          AudiobookTab()
        }.tabBar(this.tabBuilder(2, $r('app.string.tab_audiobook'), $r('app.media.app_icon')))

        TabContent() {
          Me()
        }.tabBar(this.tabBuilder(3, $r('app.string.tab_me'), $r('app.media.app_icon')))
      }
      .barHeight(56)
      .barMode(BarMode.Fixed)
      .onChange((idx: number) => {
        this.currentTab = idx;
      })
    }
    .navDestination(this.pageMap)
    .mode(NavigationMode.Stack)
    .hideTitleBar(true)
    .backgroundColor(AppColors.bgPrimary)
  }
}
