@Component
struct Onboarding {
  build() {
    Column({ space: 12 }) {
      Text('Onboarding')
        .fontSize(24)
        .fontWeight(FontWeight.Bold)

      Text('Domestic HarmonyOS onboarding flow will be implemented here.')
        .fontSize(14)
        .opacity(0.75)
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
    .alignItems(HorizontalAlign.Center)
    .padding(24)
  }
}
