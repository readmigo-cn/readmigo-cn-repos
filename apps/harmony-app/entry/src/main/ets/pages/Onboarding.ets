@Entry
@Component
struct Onboarding {
  build() {
    Column() {
      Text('欢迎使用')
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
    .alignItems(HorizontalAlign.Center)
  }
}
