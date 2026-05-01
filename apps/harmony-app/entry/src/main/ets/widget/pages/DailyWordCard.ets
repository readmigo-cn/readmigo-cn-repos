@Entry
@Component
struct DailyWordCard {
  @LocalStorageProp('word') word: string = '...';
  @LocalStorageProp('partOfSpeech') partOfSpeech: string = '';
  @LocalStorageProp('definition') definition: string = '';
  @LocalStorageProp('exampleEn') exampleEn: string = '';
  @LocalStorageProp('exampleZh') exampleZh: string = '';
  @LocalStorageProp('date') date: string = '';

  build() {
    Column({ space: 4 }) {
      Row() {
        Text(this.word)
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
          .fontColor('#1a1a1a')
          .layoutWeight(1)
        Text(this.partOfSpeech)
          .fontSize(11)
          .fontColor('#2E7D32')
          .padding({ left: 4, right: 4 })
          .borderRadius(4)
          .backgroundColor('#E8F5E9')
      }
      .width('100%')

      Text(this.definition)
        .fontSize(13)
        .fontColor('#333')
        .maxLines(2)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
        .width('100%')

      Text(this.exampleEn)
        .fontSize(11)
        .fontColor('#666')
        .fontStyle(FontStyle.Italic)
        .maxLines(1)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
        .width('100%')

      Text(this.exampleZh)
        .fontSize(11)
        .fontColor('#999')
        .maxLines(1)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
        .width('100%')

      Blank()

      Text(`今日一词 · ${this.date}`)
        .fontSize(10)
        .fontColor('#bbb')
    }
    .width('100%')
    .height('100%')
    .padding(12)
    .backgroundColor('#FFFDF9')
    .borderRadius(16)
  }
}
