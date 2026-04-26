@Entry
@Component
struct Index {
  build() {
    Column({ space: 16 }) {
      Text($r('app.string.home_title'))
        .fontSize(28)
        .fontWeight(FontWeight.Bold)
        .fontColor($r('app.color.text_primary'))

      Text($r('app.string.home_subtitle'))
        .fontSize(16)
        .fontColor($r('app.color.text_primary'))
        .opacity(0.75)

      Text($r('app.string.agc_hint'))
        .fontSize(14)
        .fontColor($r('app.color.text_primary'))
        .padding(16)
        .backgroundColor($r('app.color.surface_muted'))
        .borderRadius(16)

      Column({ space: 10 }) {
        Text($r('app.string.discover_title'))
        Text($r('app.string.library_title'))
        Text($r('app.string.reader_title'))
        Text($r('app.string.me_title'))
      }
      .fontSize(15)
      .fontColor($r('app.color.text_primary'))
      .opacity(0.8)
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
    .alignItems(HorizontalAlign.Center)
    .padding(24)
    .backgroundColor('#FFFDF9')
  }
}
