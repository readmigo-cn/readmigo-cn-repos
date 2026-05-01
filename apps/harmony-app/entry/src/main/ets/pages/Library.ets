import { AppColors } from '../theme/AppColors';
import { AppFontSize, AppFontWeight } from '../theme/AppTypography';
import { AppSpacing } from '../theme/AppSpacing';
import { RouterService } from '../router/RouterService';
import { RoutePath } from '../router/RouteConstants';
import { BookSummary, BooksApi } from '../service/api/BooksApi';
import { ApiError } from '../service/HttpClient';

@Component
export struct Library {
  @State books: BookSummary[] = [];
  @State loading: boolean = false;
  @State errMsg: string = '';

  aboutToAppear(): void {
    this.loadBooks();
  }

  private async loadBooks(): Promise<void> {
    this.loading = true;
    this.errMsg = '';
    try {
      this.books = await BooksApi.list(1, 50);
    } catch (err) {
      const e = err as ApiError;
      this.errMsg = e.message ?? 'common_error_unknown';
    } finally {
      this.loading = false;
    }
  }

  @Builder
  emptyView() {
    Column({ space: AppSpacing.base }) {
      Text($r('app.string.library_empty_title'))
        .fontSize(AppFontSize.md)
        .fontColor(AppColors.textSecondary)
      Text($r('app.string.library_empty_action'))
        .fontSize(AppFontSize.sm)
        .fontColor(AppColors.brand)
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
  }

  build() {
    Column() {
      Text($r('app.string.library_title'))
        .fontSize(AppFontSize.xl)
        .fontWeight(AppFontWeight.bold)
        .fontColor(AppColors.textPrimary)
        .padding(AppSpacing.base)
        .width('100%')
        .textAlign(TextAlign.Start)

      if (this.loading) {
        Column() {
          LoadingProgress().width(40).height(40).color(AppColors.brand)
        }
        .width('100%').height('100%').justifyContent(FlexAlign.Center)
      } else if (this.books.length === 0) {
        this.emptyView()
      } else {
        Grid() {
          ForEach(this.books, (b: BookSummary) => {
            GridItem() {
              Column({ space: AppSpacing.xs }) {
                Image(b.coverUrl ?? $r('app.media.app_icon'))
                  .width('100%')
                  .aspectRatio(0.7)
                  .borderRadius(8)
                Text(b.title)
                  .fontSize(AppFontSize.sm)
                  .fontColor(AppColors.textPrimary)
                  .maxLines(2)
                  .textOverflow({ overflow: TextOverflow.Ellipsis })
              }
              .onClick(() => {
                const params: Record<string, string> = { bookId: b.id };
                RouterService.push(RoutePath.READER, params);
              })
            }
          })
        }
        .columnsTemplate('1fr 1fr 1fr')
        .columnsGap(AppSpacing.sm)
        .rowsGap(AppSpacing.base)
        .padding(AppSpacing.base)
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor(AppColors.bgPrimary)
  }
}
