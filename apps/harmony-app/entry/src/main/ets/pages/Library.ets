/**
 * Library Page - Placeholder
 */
@Entry
@Component
struct Library {
  build() {
    Column() {
      Text('书架')
        .fontSize(20)
        .fontWeight(FontWeight.Bold)
      Text('功能开发中...')
        .fontSize(16)
        .fontColor('#666666')
        .margin({ top: 20 })
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
    .alignItems(HorizontalAlign.Center)
    .backgroundColor('#FFFDF9')
  }
}
