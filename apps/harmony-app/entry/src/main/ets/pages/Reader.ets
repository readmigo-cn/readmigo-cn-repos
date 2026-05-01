import { AppColors } from '../theme/AppColors';
import { AppFontSize, AppFontWeight } from '../theme/AppTypography';
import { AppSpacing } from '../theme/AppSpacing';
import { ReaderRouteParams } from '../router/RouteConstants';
import { RouterService } from '../router/RouterService';
import { SettingsStore } from '../store/SettingsStore';
import {
  TypesettingEngine,
  TypesetPage,
  createTypesettingEngine,
} from '../native/typesetting';

const SAMPLE_HTML = `
<h1>Chapter 1 — The Beginning</h1>
<p>It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.</p>
<p>However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered the rightful property of some one or other of their daughters.</p>
<p>"My dear Mr. Bennet," said his lady to him one day, "have you heard that Netherfield Park is let at last?"</p>
<p>Mr. Bennet replied that he had not.</p>
<p>"But it is," returned she; "for Mrs. Long has just been here, and she told me all about it."</p>
<p>Mr. Bennet made no answer.</p>
<p>"Do not you want to know who has taken it?" cried his wife impatiently.</p>
<p>"You want to tell me, and I have no objection to hearing it."</p>
<p>This was invitation enough.</p>
`.trim();

@Component
export struct Reader {
  @Prop params: ReaderRouteParams;
  @State pageIndex: number = 0;
  @State pageCount: number = 0;
  @State currentPage: TypesetPage | null = null;
  @State fontSize: number = SettingsStore.getReaderFontSize();
  @State engineReady: boolean = false;

  private engine: TypesettingEngine | null = null;
  private chapterId: string = 'chapter-1';
  private settings: RenderingContextSettings = new RenderingContextSettings(true);
  private context: CanvasRenderingContext2D = new CanvasRenderingContext2D(this.settings);
  private pageWidth: number = 360;
  private pageHeight: number = 640;

  aboutToAppear(): void {
    this.chapterId = this.params?.chapterId ?? 'chapter-1';
    this.engine = createTypesettingEngine();
    const summary = this.engine.layoutHtml(
      SAMPLE_HTML,
      this.chapterId,
      this.pageWidth,
      this.pageHeight,
      this.fontSize,
    );
    this.pageCount = summary.pageCount;
    this.engineReady = true;
    this.loadPage(0);
  }

  aboutToDisappear(): void {
    this.engine?.destroy();
    this.engine = null;
  }

  private loadPage(index: number): void {
    if (!this.engine) return;
    if (index < 0 || index >= this.pageCount) return;
    this.pageIndex = index;
    this.currentPage = this.engine.getPage(this.chapterId, index);
    this.draw();
  }

  private draw(): void {
    const ctx = this.context;
    const page = this.currentPage;
    ctx.fillStyle = AppColors.bgReader;
    ctx.fillRect(0, 0, this.pageWidth, this.pageHeight);
    if (!page) return;

    ctx.fillStyle = AppColors.textPrimary;
    for (const line of page.lines) {
      for (const run of line.runs) {
        ctx.font = `${run.fontSize}px HarmonyOS Sans`;
        ctx.fillText(run.text, run.x, run.y);
      }
    }
  }

  private adjustFontSize(delta: number): void {
    const next = Math.max(12, Math.min(28, this.fontSize + delta));
    if (next === this.fontSize) return;
    this.fontSize = next;
    SettingsStore.setReaderFontSize(next);
    if (this.engine) {
      const summary = this.engine.layoutHtml(SAMPLE_HTML, this.chapterId, this.pageWidth, this.pageHeight, next);
      this.pageCount = summary.pageCount;
      this.loadPage(Math.min(this.pageIndex, this.pageCount - 1));
    }
  }

  build() {
    NavDestination() {
      Column() {
        // 顶栏
        Row({ space: AppSpacing.sm }) {
          Text('< 返回')
            .fontSize(AppFontSize.sm)
            .fontColor(AppColors.brand)
            .onClick(() => RouterService.pop())
          Blank()
          Text(`A-`)
            .fontSize(AppFontSize.md)
            .fontColor(AppColors.textPrimary)
            .padding(AppSpacing.xs)
            .onClick(() => this.adjustFontSize(-1))
          Text(`A+`)
            .fontSize(AppFontSize.md)
            .fontColor(AppColors.textPrimary)
            .padding(AppSpacing.xs)
            .onClick(() => this.adjustFontSize(1))
        }
        .width('100%')
        .padding({ left: AppSpacing.base, right: AppSpacing.base, top: AppSpacing.sm, bottom: AppSpacing.sm })
        .backgroundColor(AppColors.bgReader)

        // 翻页画布
        Stack() {
          Canvas(this.context)
            .width(this.pageWidth)
            .height(this.pageHeight)
            .backgroundColor(AppColors.bgReader)
            .onReady(() => this.draw())
            .gesture(
              PanGesture({ direction: PanDirection.Horizontal })
                .onActionEnd((e: GestureEvent) => {
                  const dx = e.offsetX;
                  if (dx < -50) this.loadPage(this.pageIndex + 1);
                  else if (dx > 50) this.loadPage(this.pageIndex - 1);
                }),
            )
        }
        .layoutWeight(1)
        .alignContent(Alignment.Center)
        .backgroundColor(AppColors.bgReader)

        // 底栏：进度
        Row() {
          Text(`${this.pageIndex + 1} / ${this.pageCount}`)
            .fontSize(AppFontSize.sm)
            .fontColor(AppColors.textSecondary)
        }
        .width('100%')
        .justifyContent(FlexAlign.Center)
        .padding(AppSpacing.sm)
        .backgroundColor(AppColors.bgReader)
      }
      .width('100%')
      .height('100%')
      .backgroundColor(AppColors.bgReader)
    }
    .hideTitleBar(true)
  }
}
