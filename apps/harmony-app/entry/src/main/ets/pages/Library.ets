import { SimpleIcon } from '../components/IconPlaceholder';
import { BookApi } from '../service/BookApi';
import type { Book, UserBook } from '../model/Book';

/**
 * Library Page - User's bookshelf / library management
 * 功能对齐：web/src/app/(main)/library/library-content.tsx
 * 
 * Features:
 * - Continue reading section (horizontal scroll)
 * - Recently browsed books
 * - Favorite books grid with edit/batch delete mode
 * - Empty state for new users
 * - Guest mode prompt (login to view library)
 */
@Entry
@Component
struct Library {
  @State userBooks: UserBook[] = [];
  @State readingBooks: UserBook[] = [];
  @State recentlyBrowsed: Book[] = [];
  @State isLoading: boolean = true;
  @State isAuthenticated: boolean = false; // TODO: Get from auth store
  
  // Edit mode state for batch delete (aligned with overseas)
  @State isEditMode: boolean = false;
  @State selectedBookIds: Set<string> = new Set();
  @State showDeleteConfirm: boolean = false;
  @State isDeleting: boolean = false;

  aboutToAppear() {
    this.loadData();
  }

  async loadData() {
    if (!this.isAuthenticated) {
      this.isLoading = false;
      return;
    }

    try {
      const [userBooks, readingProgress] = await Promise.all([
        BookApi.getUserLibrary(),
        BookApi.getReadingProgress()
      ]);
      
      this.userBooks = userBooks;
      // Map reading progress to user books
      this.readingBooks = userBooks
        .filter(ub => ub.progress > 0 && ub.status === 'reading')
        .sort((a, b) => {
          const aTime = a.lastReadAt ? a.lastReadAt.getTime() : 0;
          const bTime = b.lastReadAt ? b.lastReadAt.getTime() : 0;
          return bTime - aTime;
        });
    } catch (error) {
      console.error('Failed to load library data', error);
    } finally {
      this.isLoading = false;
    }
  }

  toggleSelect(bookId: string) {
    if (this.selectedBookIds.has(bookId)) {
      this.selectedBookIds.delete(bookId);
    } else {
      this.selectedBookIds.add(bookId);
    }
    this.selectedBookIds = new Set(this.selectedBookIds); // Trigger re-render
  }

  exitEditMode() {
    this.isEditMode = false;
    this.selectedBookIds.clear();
  }

  async handleDeleteConfirmed() {
    this.isDeleting = true;
    try {
      // Delete all selected books
      for (const bookId of this.selectedBookIds) {
        await BookApi.removeFromLibrary(bookId);
      }
      // Reload library
      await this.loadData();
      this.exitEditMode();
    } catch (error) {
      console.error('Failed to delete books', error);
    } finally {
      this.isDeleting = false;
      this.showDeleteConfirm = false;
    }
  }

  build() {
    if (!this.isAuthenticated) {
      // Guest mode - show login prompt
      this.GuestView()
    } else if (this.isLoading) {
      // Loading skeleton
      this.LoadingView()
    } else if (this.isEmpty()) {
      // Empty state
      this.EmptyView()
    } else {
      // Normal library view
      this.LibraryView()
    }
  }

  @Builder GuestView() {
    Scroll() {
      Column({ space: 24 }) {
        // Login prompt card
        Column({ space: 16 }) {
          // Icon
          Stack() {
            Circle()
              .width(80)
              .height(80)
              .fill('#f5f5f5')
            Image(SimpleIcon({ name: 'person', size: 40, color: '#4CAF50' }))
              .width(40)
              .height(40)
              .fillColor('#4CAF50')
          }

          Text('登录登录后查看书架')
            .fontSize(18)
            .fontWeight(FontWeight.SemiBold)

          Text('登录后即可同步您的阅读进度和藏书')
            .fontSize(14)
            .fontColor('#999999')
            .textAlign(TextAlign.Center)

          Button('立即登录')
            .width('60%')
            .margin({ top: 16 })
            .onClick(() => {
              // TODO: Navigate to login
              console.info('Navigate to login');
            })
        }
        .padding(40)
        .backgroundColor('#f9f9f9')
        .borderRadius(20)
        .width('90%')

        // Recently browsed (available for guests)
        if (this.recentlyBrowsed.length > 0) {
          this.RecentlyBrowsedSection()
        }
      }
      .width('100%')
      .padding({ top: 40, bottom: 40 })
    }
    .backgroundColor('#FFFDF9')
  }

  @Builder LoadingView() {
    Scroll() {
      Column({ space: 24 }) {
        // Skeleton for continue reading
        this.ContinueReadingSkeleton()

        // Skeleton for favorites
        this.FavoritesSkeleton()
      }
      .width('100%')
      .padding(16)
    }
    .backgroundColor('#FFFDF9')
  }

  @Builder LibraryView() {
    Scroll() {
      Column({ space: 24 }) {
        // Continue Reading Section
        if (this.readingBooks.length > 0) {
          this.ContinueReadingSection()
        }

        // Recently Browsed Section
        if (this.recentlyBrowsed.length > 0) {
          this.RecentlyBrowsedSection()
        }

        // Favorite Books Section (with edit mode)
        this.FavoriteBooksSection()

        // Bottom padding
        Divider().height(40).backgroundColor(Color.Transparent)
      }
      .width('100%')
      .padding(16)
    }
    .backgroundColor('#FFFDF9')

    // Edit mode bottom bar
    if (this.isEditMode) {
      this.EditModeBar()
    }
  }

  @Builder ContinueReadingSection() {
    Column({ space: 12 }) {
      // Section header
      Row() {
        Text('继续阅读')
          .fontSize(18)
          .fontWeight(FontWeight.SemiBold)
      }
      .width('100%')

      // Horizontal scroll
      Scroll() {
        Row({ space: 16 }) {
          ForEach(this.readingBooks, (userBook: UserBook) => {
            ContinueReadingCard({ userBook: userBook })
              .width(160)
          })
        }
        .padding({ right: 8 })
      }
      .scrollBar(BarState.Off)
      .horizontal(true)
      .width('100%')
    }
    .width('100%')
  }

  @Builder RecentlyBrowsedSection() {
    Column({ space: 12 }) {
      // Section header with clear button
      Row() {
        Text('最近浏览')
          .fontSize(18)
          .fontWeight(FontWeight.SemiBold)
          .layoutWeight(1)

        Text('清除')
          .fontSize(14)
          .fontColor('#666666')
          .onClick(() => {
            // TODO: Clear browsing history
          })
      }
      .width('100%')

      // Horizontal scroll
      Scroll() {
        Row({ space: 16 }) {
          ForEach(this.recentlyBrowsed, (book: Book) => {
            BookCard({ book: book, showProgress: false })
              .width(120)
          })
        }
        .padding({ right: 8 })
      }
      .scrollBar(BarState.Off)
      .horizontal(true)
      .width('100%')
    }
    .width('100%')
  }

  @Builder FavoriteBooksSection() {
    Column({ space: 12 }) {
      // Section header with edit button
      Row() {
        Text('我的书架')
          .fontSize(18)
          .fontWeight(FontWeight.SemiBold)
          .layoutWeight(1)

        Text(this.isEditMode ? '完成' : '编辑')
          .fontSize(14)
          .fontColor(this.isEditMode ? '#4CAF50' : '#666666')
          .onClick(() => {
            if (this.isEditMode) {
              this.exitEditMode();
            } else {
              this.isEditMode = true;
            }
          })
      }
      .width('100%')

      // Book grid
      Grid() {
        ForEach(this.userBooks, (userBook: UserBook) => {
          GridItem() {
            this.FavoriteBookItem(userBook)
          }
        })
      }
      .columnsTemplate('1fr 1fr 1fr')
      .width('100%')
    }
    .width('100%')
  }

  @Builder FavoriteBookItem(userBook: UserBook) {
    const isSelected = this.selectedBookIds.has(userBook.bookId);

    Stack() {
      // Book card
      Column({ space: 8 }) {
        // Cover image with selection overlay
        Stack() {
          if (userBook.book.coverUrl) {
            Image(userBook.book.coverUrl)
              .width('100%')
              .aspectRatio(2/3)
              .objectFit(ImageFit.Cover)
              .borderRadius(8)
              .shadow({ radius: 4, color: '#10101015', offsetY: 2 })
          } else {
            Stack() {
              Rectangle()
                .width('100%')
                .aspectRatio(2/3)
                .backgroundColor('#f5f5f5')
                .borderRadius(8)
              Text(userBook.book.title.charAt(0))
                .fontSize(32)
                .fontColor('#cccccc')
            }
          }

          // Selection indicator (edit mode only)
          if (this.isEditMode) {
            Stack() {
              if (isSelected) {
                Image(SimpleIcon({ name: 'check', size: 24, color: '#4CAF50' }))
                  .width(24)
                  .height(24)
                  .fillColor('#4CAF50')
              } else {
                Image(SimpleIcon({ name: 'check', size: 24, color: '#999999' }))
                  .width(24)
                  .height(24)
                  .fillColor('#999999')
              }
            }
            .position({ right: 8, top: 8 })
          }

          // Progress indicator
          if (userBook.progress > 0) {
            Column() {
              Divider().height(3).backgroundColor('#4CAF50')
              Text(`${userBook.progress}%`)
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

        // Title
        Text(userBook.book.title)
          .fontSize(14)
          .fontWeight(FontWeight.Medium)
          .maxLines(2)
          .textOverflow({ overflow: TextOverflow.Ellipsis })

        // Author
        Text(userBook.book.author)
          .fontSize(12)
          .fontColor('#999999')
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
      }
      .width('100%')
      .onClick(() => {
        if (this.isEditMode) {
          this.toggleSelect(userBook.bookId);
        } else {
          // TODO: Navigate to reader
          console.info('Open book:', userBook.bookId);
        }
      })
    }
  }

  @Builder EditModeBar() {
    Row() {
      Text(`${this.selectedBookIds.size} 本已选择`)
        .fontSize(14)
        .fontColor('#666666')
        .layoutWeight(1)

      Button('删除所选')
        .backgroundColor('#f44336')
        .disabled(this.selectedBookIds.size === 0 || this.isDeleting)
        .onClick(() => {
          this.showDeleteConfirm = true;
        })
    }
    .position({ left: 0, bottom: 0 })
    .width('100%')
    .padding({ left: 16, right: 16, top: 12, bottom: 12 })
    .backgroundColor('#f5f5f5')
    .border({ width: { top: 1 }, color: '#e5e5e5' })
  }

  @Builder ContinueReadingSkeleton() {
    Column({ space: 12 }) {
      Rectangle()
        .width(120)
        .height(20)
        .backgroundColor('#e5e5e5')
        .borderRadius(4)

      Scroll() {
        Row({ space: 16 }) {
          ForEach(Array.from({ length: 3 }), (_, index: number) => {
            Column({ space: 8 }) {
              Rectangle()
                .width(120)
                .aspectRatio(2/3)
                .backgroundColor('#e5e5e5')
                .borderRadius(8)
              Rectangle()
                .width(100)
                .height(14)
                .backgroundColor('#e5e5e5')
                .borderRadius(4)
              Rectangle()
                .width(80)
                .height(10)
                .backgroundColor('#e5e5e5')
                .borderRadius(4)
            }
          })
        }
      }
      .scrollBar(BarState.Off)
      .horizontal(true)
    }
    .width('100%')
  }

  @Builder FavoritesSkeleton() {
    Column({ space: 12 }) {
      Rectangle()
        .width(120)
        .height(20)
        .backgroundColor('#e5e5e5')
        .borderRadius(4)

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
      .columnsTemplate('1fr 1fr 1fr')
      .width('100%')
    }
    .width('100%')
  }

  @Builder EmptyView() {
    Scroll() {
      Column({ space: 16 }) {
        // Empty icon
        Stack() {
          Circle()
            .width(80)
            .height(80)
            .fill('#f5f5f5')
          Image(SimpleIcon({ name: 'book', size: 40, color: '#cccccc' }))
            .width(40)
            .height(40)
            .fillColor('#cccccc')
        }

        Text('书架空空如也')
          .fontSize(18)
          .fontWeight(FontWeight.Medium)
          .fontColor('#999999')

        Text('去发现页面探索好书吧')
          .fontSize(14)
          .fontColor('#cccccc')

        Button('去逛逛')
          .width('50%')
          .margin({ top: 24 })
          .onClick(() => {
            // TODO: Navigate to discover
            console.info('Navigate to discover');
          })
      }
      .width('100%')
      .padding(60)
    }
    .backgroundColor('#FFFDF9')
  }

  isEmpty(): boolean {
    return this.userBooks.length === 0 && 
           this.readingBooks.length === 0 && 
           this.recentlyBrowsed.length === 0;
  }
}

// Continue Reading Card Component
@Component
struct ContinueReadingCard {
  @Prop userBook: UserBook | null = null;

  build() {
    Column({ space: 8 }) {
      // Cover with progress overlay
      Stack() {
        if (this.userBook?.book.coverUrl) {
          Image(this.userBook.book.coverUrl)
            .width('100%')
            .aspectRatio(2/3)
            .objectFit(ImageFit.Cover)
            .borderRadius(8)
            .shadow({ radius: 8, color: '#10101020', offsetY: 4 })
        }

        // Progress bar at bottom
        if (this.userBook && this.userBook.progress > 0) {
          Column() {
            Divider()
              .height(4)
              .backgroundColor('#4CAF50')
              .width(`${this.userBook.progress}%`)
            Text(`${this.userBook.progress}%`)
              .fontSize(10)
              .fontColor(Color.White)
              .margin({ top: 4 })
          }
          .position({ left: 0, bottom: 0 })
          .width('100%')
          .padding({ left: 8, right: 8, top: 40, bottom: 8 })
          .linearGradient({ angle: 180, colors: [['#00000066', 0], ['transparent', 1]] })
        }
      }

      // Title
      Text(this.userBook?.book.title || '')
        .fontSize(14)
        .fontWeight(FontWeight.Medium)
        .maxLines(2)
        .textOverflow({ overflow: TextOverflow.Ellipsis })

      // Author
      Text(this.userBook?.book.author || '')
        .fontSize(12)
        .fontColor('#999999')
        .maxLines(1)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
    }
    .onClick(() => {
      // TODO: Navigate to reader at current progress
      if (this.userBook) {
        console.info('Continue reading:', this.userBook.bookId);
      }
    })
  }
}

// Book Card Component (simplified version)
@Component
struct BookCard {
  @Prop book: Book | null = null;
  @Prop showProgress: boolean = true;

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
        } else {
          Stack() {
            Rectangle()
              .width('100%')
              .aspectRatio(2/3)
              .backgroundColor('#f5f5f5')
              .borderRadius(8)
            Text(this.book?.title?.charAt(0) || '?')
              .fontSize(24)
              .fontColor('#cccccc')
          }
        }
      }

      // Title
      Text(this.book?.title || '')
        .fontSize(13)
        .fontWeight(FontWeight.Medium)
        .maxLines(2)
        .textOverflow({ overflow: TextOverflow.Ellipsis })

      // Author
      Text(this.book?.author || '')
        .fontSize(11)
        .fontColor('#999999')
        .maxLines(1)
    }
    .onClick(() => {
      // TODO: Navigate to book detail
      if (this.book) {
        console.info('Open book:', this.book.id);
      }
    })
  }
}
