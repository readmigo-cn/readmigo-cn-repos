/**
 * Audiobook Player Page - Placeholder
 * 功能对齐：mobile/src/features/audiobook/components/AudioPlayer.tsx
 */

@Entry
@Component
struct AudiobookPlayer {
  build() {
    Column() {
      Text('听书播放器')
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
    .backgroundColor('#0f0f1a')
  }
}
