/**
 * Audiobook Tab Page - Audiobook library and discovery
 * 功能对齐：mobile/src/features/audiobook/components + overseas audiobook list
 * 
 * Features:
 * - Recently played audiobooks
 * - Audiobook library (user's collection)
 * - Search audiobooks
 * - TTS generation from ebooks
 * - Download management
 * - Categories and browsing
 */

import { AudiobookApi } from '../service/AudiobookApi';
import type { Audiobook, AudiobookListItem, AudiobookWithProgress } from '../model/Audiobook';

@Entry
@Component
struct AudiobookTab {
  @State audiobooks: AudiobookListItem[] = [];
  @State recentlyPlayed: AudiobookListItem[] = [];
  @State isLoading: boolean = true;
  @State searchQuery: string = '';
  @State isSearching: boolean = false;
  @State searchResults: AudiobookListItem[] = [];
  @State showSearch: boolean = false;
  @State selectedCategory: string = 'All';
  @State categories: string[] = ['All', 'Recently Played', 'Downloads', 'TTS Generated'];

  aboutToAppear() {
    this.loadData();
  }

  async loadData() {
    try {
      const [audiobooks, recentlyPlayed] = await Promise.all([
        AudiobookApi.getAudiobooks({ limit: 20 }),
        AudiobookApi.getRecentlyPlayed(10)
      ]);
      this.audiobooks = audiobooks;
      this.recentlyPlayed = recentlyPlayed;
    } catch (error) {
      console.error('Failed to load audiobooks', error);
    } finally {
      this.isLoading = false;
    }
  }

  async handleSearch() {
    if (this.searchQuery.length < 2) return;
    
    this.isSearching = true;
    try {
      this.searchResults = await AudiobookApi.searchAudiobooks(this.searchQuery, 20);
    } catch (error) {
      console.error('Search failed', error);
    } finally {
      this.isSearching = false;
    }
  }

  build() {
    Stack() {
      Column({ space: 0 }) {
        // Header
        this.Header()

        // Category tabs
        this.CategoryTabs()

        // Content
        if (this.showSearch && this.searchQuery.length > 0) {
          this.SearchContent()
        } else {
          this.MainContent()
        }
      }
      .width('100%')
      .height('100%')
      .backgroundColor('#FFFDF9')

      // Mini player (if playing)
      // TODO: Add mini player component
    }
  }

  @Builder Header() {
    Row() {
      Text('听书')
        .fontSize(28)
        .fontWeight(FontWeight.Bold)
        .fontColor('#1a1a1a')
        .layoutWeight(1)

      // Search button
      Button() {
        Image($r('app.media.search'))
          .width(24)
          .height(24)
          .fillColor('#1a1a1a')
      }
      .type(ButtonType.Circle)
      .backgroundColor('transparent')
      .onClick(() => { this.showSearch = !this.showSearch; })

      // TTS Generate button
      Button() {
        Image($r('app.media.mic'))
          .width(24)
          .height(24)
          .fillColor('#4CAF50')
      }
      .type(ButtonType.Circle)
      .backgroundColor('transparent')
      .margin({ left: 12 })
      .onClick(() => {
        // TODO: Navigate to TTS generation page
        console.info('Navigate to TTS generation');
      })
    }
    .width('100%')
    .padding({ left: 16, right: 16, top: 16, bottom: 12 })
  }

  @Builder CategoryTabs() {
    Scroll() {
      Row({ space: 12 }) {
        ForEach(this.categories, (category: string) => {
          Button() {
            Text(category)
              .fontSize(14)
              .fontColor(this.selectedCategory === category ? Color.White : '#666666')
          }
          .height(32)
          .padding({ left: 16, right: 16 })
          .backgroundColor(this.selectedCategory === category ? '#4CAF50' : '#f5f5f5')
          .borderRadius(16)
          .onClick(() => { this.selectedCategory = category; })
        })
      }
      .padding({ left: 16, right: 16 })
    }
    .scrollBar(BarState.Off)
    .horizontal(true)
    .width('100%')
  }

  @Builder MainContent() {
    Scroll() {
      Column({ space: 20 }) {
        // Recently Played section
        if (this.recentlyPlayed.length > 0 && this.selectedCategory === 'All') {
          this.RecentlyPlayedSection()
        }

        // All Audiobooks grid
        if (this.selectedCategory === 'All' || this.selectedCategory === 'Downloads') {
          this.AudiobookGrid()
        }

        // Empty state
        if (this.audiobooks.length === 0 && !this.isLoading) {
          this.EmptyState()
        }

        // Bottom padding
        Divider().height(100).backgroundColor(Color.Transparent)
      }
      .width('100%')
      .padding(16)
    }
    .scrollBar(BarState.Off)
    .edgeEffect(EdgeEffect.Spring)
  }

  @Builder SearchContent() {
    Column({ space: 16 }) {
      // Search input
      Row() {
        Image($r('app.media.search'))
          .width(20)
          .height(20)
          .fillColor('#999999')

        TextInput({ placeholder: '搜索有声书...', text: this.searchQuery })
          .layoutWeight(1)
          .backgroundColor('transparent')
          .fontSize(14)
          .onChange((value: string) => { this.searchQuery = value; })

        if (this.searchQuery.length > 0) {
          Button() {
            Image($r('app.media.close'))
              .width(18)
              .height(18)
              .fillColor('#999999')
          }
          .type(ButtonType.Circle)
          .backgroundColor('transparent')
          .onClick(() => { this.searchQuery = ''; this.searchResults = []; })
        }
      }
      .width('100%')
      .height(40)
      .padding({ left: 12, right: 12 })
      .backgroundColor('#f5f5f5')
      .borderRadius(20)

      // Search results
      if (this.isSearching) {
        LoadingProgress()
      } else if (this.searchResults.length > 0) {
        Column({ space: 12 }) {
          ForEach(this.searchResults, (item: AudiobookListItem) => {
            AudiobookListItemComponent({ item: item })
          })
        }
      } else if (this.searchQuery.length > 2) {
        Column({ space: 8 }) {
          Image($r('app.media.search_off'))
            .width(48)
            .height(48)
            .fillColor('#cccccc')
          Text('未找到相关结果')
            .fontSize(14)
            .fontColor('#999999')
        }
        .width('100%')
        .padding(40)
      }
    }
    .width('100%')
    .padding(16)
  }

  @Builder RecentlyPlayedSection() {
    Column({ space: 12 }) {
      Row() {
        Text('最近播放')
          .fontSize(18)
          .fontWeight(FontWeight.SemiBold)
        Blank()
        Text('查看全部')
          .fontSize(14)
          .fontColor('#4CAF50')
      }
      .width('100%')

      // Horizontal scroll
      Scroll() {
        Row({ space: 16 }) {
          ForEach(this.recentlyPlayed, (item: AudiobookListItem) => {
            AudiobookCardHorizontal({ item: item })
              .width(140)
          })
        }
      }
      .scrollBar(BarState.Off)
      .horizontal(true)
      .width('100%')
    }
    .width('100%')
  }

  @Builder AudiobookGrid() {
    Grid() {
      ForEach(this.audiobooks, (item: AudiobookListItem) => {
        GridItem() {
          AudiobookCardVertical({ item: item })
        }
      })
    }
    .columnsTemplate('1fr 1fr')
    .width('100%')
  }

  @Builder EmptyState() {
    Column({ space: 16 }) {
      Image($r('app.media.headset_off'))
        .width(80)
        .height(80)
        .fillColor('#cccccc')

      Text('暂无有声书')
        .fontSize(18)
        .fontColor('#999999')

      Text('从电子书生成或浏览发现更多有声书')
        .fontSize(14)
        .fontColor('#cccccc')

      Button('生成有声书')
        .backgroundColor('#4CAF50')
        .fontColor(Color.White)
        .onClick(() => {
          // TODO: Navigate to TTS generation
        })
    }
    .width('100%')
    .padding(60)
  }
}

// Audiobook List Item Component
@Component
struct AudiobookListItemComponent {
  @Prop item: AudiobookListItem | null = null;

  build() {
    Row() {
      // Cover
      if (this.item?.coverUrl) {
        Image(this.item.coverUrl)
          .width(60)
          .height(60)
          .objectFit(ImageFit.Cover)
          .borderRadius(8)
      } else {
        Stack() {
          Rectangle()
            .width(60)
            .height(60)
            .backgroundColor('#f5f5f5')
            .borderRadius(8)
          Image($r('app.media.headset'))
            .width(30)
            .height(30)
            .fillColor('#cccccc')
        }
      }

      // Info
      Column({ space: 4 }) {
        Text(this.item?.title || '')
          .fontSize(15)
          .fontWeight(FontWeight.Medium)
          .maxLines(2)
          .textOverflow({ overflow: TextOverflow.Ellipsis })

        Text(this.item?.author || '')
          .fontSize(13)
          .fontColor('#999999')
          .maxLines(1)

        Row({ space: 8 }) {
          Text(this.formatDuration(this.item?.totalDuration || 0))
            .fontSize(12)
            .fontColor('#666666')
          Text(`• ${this.item?.chapterCount} 章节`)
            .fontSize(12)
            .fontColor('#666666')
        }
      }
      .alignItems(HorizontalAlign.Start)
      .layoutWeight(1)
      .margin({ left: 12 })

      // Play button
      Button() {
        Image($r('app.media.play_arrow'))
          .width(24)
          .height(24)
          .fillColor('#4CAF50')
      }
      .width(40)
      .height(40)
      .borderRadius(20)
      .backgroundColor('#e8f5e9')
    }
    .width('100%')
    .padding(12)
    .onClick(() => {
      // TODO: Play audiobook
      console.info('Play audiobook:', this.item?.id);
    })
  }

  formatDuration(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) {
      return `${hrs}小时${mins}分`;
    }
    return `${mins}分钟`;
  }
}

// Audiobook Card Horizontal Component
@Component
struct AudiobookCardHorizontal {
  @Prop item: AudiobookListItem | null = null;

  build() {
    Column({ space: 8 }) {
      // Cover
      Stack() {
        if (this.item?.coverUrl) {
          Image(this.item.coverUrl)
            .width('100%')
            .aspectRatio(1)
            .objectFit(ImageFit.Cover)
            .borderRadius(8)
            .shadow({ radius: 4, color: '#10101015', offsetY: 2 })
        } else {
          Stack() {
            Rectangle()
              .width('100%')
              .aspectRatio(1)
              .backgroundColor('#f5f5f5')
              .borderRadius(8)
            Image($r('app.media.headset'))
              .width(40)
              .height(40)
              .fillColor('#cccccc')
          }
        }

        // Play button overlay
        Button() {
          Image($r('app.media.play_arrow'))
            .width(32)
            .height(32)
            .fillColor(Color.White)
        }
        .width(48)
        .height(48)
        .borderRadius(24)
        .backgroundColor('rgba(0, 0, 0, 0.5)')
        .visibility('hidden')
        .position({ x: '50%', y: '50%' })
        .translate({ x: '-50%', y: '-50%' })
      }

      // Title
      Text(this.item?.title || '')
        .fontSize(13)
        .fontWeight(FontWeight.Medium)
        .maxLines(2)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
        .width('100%')
    }
    .onClick(() => {
      // TODO: Play audiobook
      console.info('Play audiobook:', this.item?.id);
    })
  }
}

// Audiobook Card Vertical Component
@Component
struct AudiobookCardVertical {
  @Prop item: AudiobookListItem | null = null;

  build() {
    Column({ space: 8 }) {
      // Cover
      Stack() {
        if (this.item?.coverUrl) {
          Image(this.item.coverUrl)
            .width('100%')
            .aspectRatio(1)
            .objectFit(ImageFit.Cover)
            .borderRadius(8)
            .shadow({ radius: 4, color: '#10101015', offsetY: 2 })
        } else {
          Stack() {
            Rectangle()
              .width('100%')
              .aspectRatio(1)
              .backgroundColor('#f5f5f5')
              .borderRadius(8)
            Image($r('app.media.headset'))
              .width(40)
              .height(40)
              .fillColor('#cccccc')
          }
        }
      }

      // Title
      Text(this.item?.title || '')
        .fontSize(14)
        .fontWeight(FontWeight.Medium)
        .maxLines(2)
        .textOverflow({ overflow: TextOverflow.Ellipsis })

      // Author
      Text(this.item?.author || '')
        .fontSize(12)
        .fontColor('#999999')
        .maxLines(1)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
    }
    .onClick(() => {
      // TODO: Play audiobook
      console.info('Play audiobook:', this.item?.id);
    })
  }
}

// Loading Progress Component
@Component
struct LoadingProgress {
  build() {
    LoadingProgress()
      .width(40)
      .height(40)
      .color('#4CAF50')
  }
}
