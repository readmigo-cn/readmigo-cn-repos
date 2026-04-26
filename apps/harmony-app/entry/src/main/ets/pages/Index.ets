/**
 * Index Page - Main entry with navigation
 */
@Entry
@Component
struct Index {
  build() {
    Column({ space: 16 }) {
      Text('阅可')
        .fontSize(28)
        .fontWeight(FontWeight.Bold)

      Text('Readmigo 鸿蒙版工程骨架')
        .fontSize(16)

      Text('将 agconnect-services.json 放到 entry 目录后再接入 AGC')
        .fontSize(14)
        .padding(16)
        .backgroundColor('#f5f5f5')
        .borderRadius(16)

      Column({ space: 10 }) {
        Text('Discover')
          .fontSize(15)
        Text('Library')
          .fontSize(15)
        Text('Reader')
          .fontSize(15)
        Text('Me')
          .fontSize(15)
        Text('Audiobook')
          .fontSize(15)
      }
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
    .alignItems(HorizontalAlign.Center)
    .padding(24)
    .backgroundColor('#FFFDF9')
  }
}
