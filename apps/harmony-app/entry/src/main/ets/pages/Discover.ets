import { BookApi } from '../service/BookApi';
import type { Book, BookList } from '../model/Book';

/**
 * Discover Page - Book recommendations and feeds
 * 功能对齐：web/src/features/library/components/hero-banner.tsx + book-grid.tsx
 * 
 * Features:
 * - Hero banner with rotating book lists (AI Recommended, Rankings, etc.)
 * - Category-based book sections
 * - Popular / Recommended books
 * - Horizontal scrollable book cards
 */
@Entry
@Component
struct Discover {
  @State bookLists: BookList[] = [];
  @State recommendedBooks: Book[] = [];
  @State popularBooks: Book[] = [];
  @State isLoading: boolean = true;
  @State currentBannerIndex: number = 0;
  @State categories: string[] = ['Fiction', 'Non-Fiction', 'Science', 'Business', 'Biography'];
  @State selectedCategory: string = 'All';

  aboutToAppear() {
    this.loadData();
    this.startBannerAutoRotate();
  }

  async loadData() {
    try {
      const [bookLists, recommended, popular] = await Promise.all([
        BookApi.getBookLists(),
        BookApi.getRecommendedBooks(),
        BookApi.getPopularBooks()
      ]);
      this.bookLists = bookLists;
      this.recommendedBooks = recommended;
      this.popularBooks = popular;
    } catch (error) {
      console.error('Failed to load discover data', error);
      // TODO: Show error state
    } finally {
      this.isLoading = false;
    }
  }

  startBannerAutoRotate() {
    // Auto-rotate hero banner every 4 seconds (aligned with overseas)
    setInterval(() => {
      if (this.bookLists.length > 1) {
        this.currentBannerIndex = (this.currentBannerIndex + 1) % Math.min(this.bookLists.length, 3);
      }
    }, 4000);
  }

  getGradientColors(type: string): LinearGradient {
    const gradientMap: Record<string, [string, string]> = {
      'RANKING': ['#f97316', '#dc2626'],
      'EDITORS_PICK': ['#3b82f6', '#9333ea'],
      'COLLECTION': ['#22c55e', '#14b8a6'],
      'UNIVERSITY': ['#6366f1', '#3b82f6'],
      'CELEBRITY': ['#ec4899', '#f43f5e'],
      'ANNUAL_BEST': ['#f59e0b', '#f97316'],
      'AI_RECOMMENDED': ['#06b6d4', '#3b82f6'],
      'PERSONALIZED': ['#8b5cf6', '#a855f7'],
      'AI_FEATURED': ['#a855f7', '#ec4899']
    };
    const colors = gradientMap[type] || ['#6b7280', '#2563eb'];
    return {
      angle: 90,
      colors: [[colors[0], 0], [colors[1], 1]]
    };
  }

  build() {
    Scroll() {
      Column({ space: 16 }) {
        // Hero Banner - aligned with overseas HeroBanner component
        if (this.bookLists.length > 0) {
          this.HeroBanner()
        } else if (this.isLoading) {
          // Skeleton loader
          SkeletonBanner()
        }

        // Continue Reading Section (if user has books in progress)
        // TODO: Implement when auth is ready

        // AI Recommended Books
        SectionHeader({ 
          title: 'AI 推荐', 
          showAction: true 
        })
        BookGrid({ 
          books: this.recommendedBooks, 
          isLoading: this.isLoading,
          columns: 3
        })

        // Popular Books
        SectionHeader({ 
          title: '热门推荐', 
          showAction: true 
        })
        BookGrid({ 
          books: this.popularBooks, 
          isLoading: this.isLoading,
          columns: 3
        })

        // Category-based sections
        ForEach(this.categories, (category: string) => {
          Column({ space: 12 }) {
            SectionHeader({ 
              title: category, 
              showAction: true 
            })
            // Horizontal scrollable book list
            HorizontalBookList({ category: category })
          }
          .width('100%')
        })

        // Bottom padding for scroll
        Divider().height(20).backgroundColor(Color.Transparent)
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 16 })
    }
    .scrollBar(BarState.Off)
    .edgeEffect(EdgeEffect.Spring)
    .backgroundColor('#FFFDF9')
  }

  @Builder HeroBanner() {
    const slides = this.bookLists.slice(0, 3);
    
    Stack() {
      // Banner slides
      Row() {
        ForEach(slides, (bookList: BookList, index: number) => {
          this.BannerSlide({ bookList: bookList, index: index })
            .width('100%')
            .height(200)
        })
      }
      .width('100%')
      .height(200)
      .borderRadius(20)
      .clip(true)

      // Dots indicator
      if (slides.length > 1) {
        Row({ space: 8 }) {
          ForEach(slides, (_, index: number) => {
            Divider()
              .width(index === this.currentBannerIndex ? 24 : 8)
              .height(8)
              .borderRadius(4)
              .backgroundColor(index === this.currentBannerIndex ? Color.White : '#ffffff80')
          })
        }
        .position({ x: '50%', y: '90%' })
        .translate({ x: '-50%' })
      }
    }
    .width('100%')
    .height(200)
  }

  @Builder BannerSlide({ bookList, index }: { bookList: BookList, index: number }) {
    Stack() {
      // Gradient background
      Column()
        .width('100%')
        .height('100%')
        .linearGradient(this.getGradientColors(bookList.type))

      // Content
      Row() {
        // Text content
        Column({ space: 8 }) {
          Text(bookList.type)
            .fontSize(12)
            .fontColor('#ffffffcc')
            .padding({ left: 12, right: 12, top: 4, bottom: 4 })
            .backgroundColor('#ffffff33')
            .borderRadius(12)

          Text(bookList.name)
            .fontSize(20)
            .fontWeight(FontWeight.Bold)
            .fontColor(Color.White)
            .maxLines(2)
            .textOverflow({ overflow: TextOverflow.Ellipsis })

          if (bookList.subtitle) {
            Text(bookList.subtitle)
              .fontSize(14)
              .fontColor('#ffffffcc')
              .maxLines(1)
              .textOverflow({ overflow: TextOverflow.Ellipsis })
          }

          Text(`${bookList.bookCount} books`)
            .fontSize(12)
            .fontColor('#ffffffb3')
        }
        .alignItems(HorizontalAlign.Start)
        .layoutWeight(1)

        // Book covers stack (if books available)
        if (bookList.books && bookList.books.length > 0) {
          Row({ space: -16 }) {
            ForEach(bookList.books.slice(0, 3), (book: any, idx: number) => {
              Image(book.coverUrl || '')
                .width(80)
                .height(120)
                .borderRadius(8)
                .objectFit(ImageFit.Cover)
                .shadow({ radius: 8, color: '#10101030', offsetY: 4 })
                .rotate({ angle: (idx - 1) * 3 })
            })
          }
          .alignItems(VerticalAlign.Bottom)
        }
      }
      .width('100%')
      .height('100%')
      .padding(20)
    }
    .onClick(() => {
      // TODO: Navigate to book list detail
      console.info('Navigate to book list:', bookList.id);
    })
  }
}

// Section Header Component
@Component
struct SectionHeader {
  @Prop title: string = '';
  @Prop showAction: boolean = false;

  build() {
    Row() {
      Text(this.title)
        .fontSize(18)
        .fontWeight(FontWeight.SemiBold)
        .fontColor('#1a1a1a')
        .layoutWeight(1)

      if (this.showAction) {
        Row({ space: 4 }) {
          Text('查看更多')
            .fontSize(14)
            .fontColor('#666666')
          Image($r('app.media.chevron_right'))
            .width(16)
            .height(16)
            .fillColor('#666666')
        }
        .onClick(() => {
          // TODO: Navigate to full list
        })
      }
    }
    .width('100%')
  }
}

// Book Grid Component - aligned with overseas BookGrid
@Component
struct BookGrid {
  @Prop books: Book[] = [];
  @Prop isLoading: boolean = false;
  @Prop columns: number = 3;

  build() {
    if (this.isLoading) {
      // Skeleton loader
      Grid() {
        ForEach(Array.from({ length: 6 }), (_, index: number) => {
          GridItem() {
            Column({ space: 8 }) {
              Rectangle()
                .width('100%')
                .aspectRatio(2/3)
                .backgroundColor('#e5e5e5')
                .borderRadius(8)
              Rectangle()
                .width('75%')
                .height(14)
                .backgroundColor('#e5e5e5')
                .borderRadius(4)
              Rectangle()
                .width('50%')
                .height(10)
                .backgroundColor('#e5e5e5')
                .borderRadius(4)
            }
          }
        })
      }
      .columnsTemplate(this.columnsTemplate())
      .width('100%')
    } else if (this.books.length === 0) {
      // Empty state
      Column({ space: 12 }) {
        Text('暂无书籍')
          .fontSize(16)
          .fontColor('#999999')
        Text('探索更多好书')
          .fontSize(14)
          .fontColor('#cccccc')
      }
      .width('100%')
      .padding(40)
    } else {
      // Book grid
      Grid() {
        ForEach(this.books, (book: Book) => {
          GridItem() {
            BookCard({ book: book })
          }
        })
      }
      .columnsTemplate(this.columnsTemplate())
      .width('100%')
    }
  }

  columnsTemplate(): string {
    return Array(this.columns).fill('1fr').join(' ');
  }
}

// Book Card Component - aligned with overseas BookCard
@Component
struct BookCard {
  @Prop book: Book | null = null;

  build() {
    Column({ space: 8 }) {
      // Cover image
      Stack() {
        if (this.book?.coverUrl) {
          Image(this.book.coverUrl)
            .width('100%')
            .aspectRatio(2/3)
            .objectFit(ImageFit.Cover)
            .borderRadius(8)
            .shadow({ radius: 4, color: '#10101015', offsetY: 2 })
        } else {
          // Placeholder with first letter
          Stack() {
            Rectangle()
              .width('100%')
              .aspectRatio(2/3)
              .backgroundColor('#f5f5f5')
              .borderRadius(8)
            Text(this.book?.title?.charAt(0) || '?')
              .fontSize(32)
              .fontColor('#cccccc')
              .fontWeight(FontWeight.Bold)
          }
        }

        // Progress indicator (if book is being read)
        if (this.book && (this.book as any).progress > 0) {
          Column() {
            Divider().height(3).backgroundColor('#4CAF50').width('100%')
            Text(`${(this.book as any).progress}%`)
              .fontSize(10)
              .fontColor(Color.White)
              .margin({ top: 2 })
          }
          .position({ right: 8, bottom: 8 })
          .padding({ left: 8, right: 8, top: 4, bottom: 4 })
          .backgroundColor('#00000066')
          .borderRadius(4)
        }
      }

      // Title and author
      Text(this.book?.title || '')
        .fontSize(14)
        .fontWeight(FontWeight.Medium)
        .maxLines(2)
        .textOverflow({ overflow: TextOverflow.Ellipsis })

      Text(this.book?.author || '')
        .fontSize(12)
        .fontColor('#999999')
        .maxLines(1)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
    }
    .width('100%')
    .onClick(() => {
      // TODO: Navigate to book detail
      if (this.book) {
        console.info('Navigate to book:', this.book.id);
      }
    })
  }
}

// Horizontal Book List Component
@Component
struct HorizontalBookList {
  @Prop category: string = '';

  build() {
    Scroll() {
      Row({ space: 16 }) {
        ForEach(Array.from({ length: 8 }), (_, index: number) => {
          BookCard({ book: null })
            .width(120)
        })
      }
      .padding({ right: 16 })
    }
    .scrollBar(BarState.Off)
    .horizontal(true)
    .width('100%')
  }
}

// Skeleton Banner Component
@Component
struct SkeletonBanner {
  build() {
    Rectangle()
      .width('100%')
      .height(200)
      .backgroundColor('#e5e5e5')
      .borderRadius(20)
  }
}
