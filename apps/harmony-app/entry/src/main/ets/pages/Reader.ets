import { SimpleIcon } from '../components/IconPlaceholder';
import type { BookDetail, Chapter } from '../model/Book';

/**
 * Reader Page - EPUB reading experience with AI features
 * 功能对齐：web/src/features/reader/components/chapter-reader.tsx + reader-toolbar.tsx
 * 
 * Core Features (aligned with overseas):
 * - Chapter-based EPUB rendering
 * - Bookmarks, highlights, notes
 * - Text selection with translation (AI-powered)
 * - TTS (text-to-speech) with domestic providers
 * - Typography settings (font, size, theme)
 * - Reading stats tracking
 * - Search within book
 * - Table of contents navigation
 * 
 * AI Features (domestic LLM integration):
 * - Word/phrase translation (DeepSeek / 百度翻译)
 * - Context explanation
 * - Reading comprehension help
 * - Vocabulary learning
 */
@Entry
@Component
struct Reader {
  @State book: BookDetail | null = null;
  @State chapters: Chapter[] = [];
  @State currentChapterIndex: number = 0;
  @State isLoading: boolean = true;
  
  // Reader settings (aligned with overseas reader store)
  @State fontSize: number = 18;
  @State fontFamily: string = 'HarmonyOS Sans';
  @State theme: 'light' | 'dark' | 'sepia' = 'light';
  @State brightness: number = 100;
  @State lineSpacing: number = 1.6;
  
  // UI state
  @State showToolbar: boolean = true;
  @State showTOC: boolean = false;
  @State showSettings: boolean = false;
  @State showBookmarks: boolean = false;
  @State showHighlights: boolean = false;
  @State showSearch: boolean = false;
  @State showTranslation: boolean = false;
  
  // Reading progress
  @State currentPage: number = 1;
  @State totalPages: number = 1;
  @State readingProgress: number = 0;
  
  // Selection & AI features
  @State selectedText: string = '';
  @State translation: string = '';
  @State isTranslating: boolean = false;
  
  // Bookmarks & highlights
  @State bookmarks: Bookmark[] = [];
  @State highlights: Highlight[] = [];
  
  aboutToAppear() {
    this.loadBook();
  }

  async loadBook() {
    try {
      // TODO: Get bookId from params
      const bookId = 'demo-book-id';
      // TODO: Call API to load book detail
      // const data = await BookApi.getBookDetail(bookId);
      // this.book = data;
      // this.chapters = data.chapters;
      
      // Mock data for now
      this.chapters = [
        { id: 'ch1', title: 'Chapter 1', href: '/chapter1', order: 1 },
        { id: 'ch2', title: 'Chapter 2', href: '/chapter2', order: 2 },
      ];
    } catch (error) {
      console.error('Failed to load book', error);
    } finally {
      this.isLoading = false;
    }
  }

  goToChapter(index: number) {
    if (index >= 0 && index < this.chapters.length) {
      this.currentChapterIndex = index;
      this.currentPage = 1;
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updateProgress();
    } else if (this.currentChapterIndex < this.chapters.length - 1) {
      this.goToChapter(this.currentChapterIndex + 1);
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    } else if (this.currentChapterIndex > 0) {
      this.goToChapter(this.currentChapterIndex - 1);
    }
  }

  updateProgress() {
    const totalProgress = (this.currentChapterIndex / this.chapters.length) * 100;
    this.readingProgress = Math.round(totalProgress);
    
    // TODO: Sync progress to server
    // BookApi.updateProgress(this.book?.id || '', this.readingProgress);
  }

  async translateText(text: string) {
    this.isTranslating = true;
    try {
      // TODO: Call domestic translation API (百度翻译 / DeepSeek)
      // const result = await TranslationApi.translate(text, 'en', 'zh');
      // this.translation = result;
      
      // Mock translation
      await new Promise(resolve => setTimeout(resolve, 500));
      this.translation = `[翻译] ${text}`;
    } catch (error) {
      console.error('Translation failed', error);
    } finally {
      this.isTranslating = false;
    }
  }

  addBookmark() {
    const bookmark: Bookmark = {
      id: `bm-${Date.now()}`,
      chapterIndex: this.currentChapterIndex,
      page: this.currentPage,
      text: `Chapter ${this.currentChapterIndex + 1}, Page ${this.currentPage}`,
      createdAt: new Date(),
      note: ''
    };
    this.bookmarks.push(bookmark);
    // TODO: Save to server
  }

  build() {
    Stack() {
      // Main reading area
      this.ReadingArea()

      // Toolbar (top)
      if (this.showToolbar) {
        this.ReaderToolbar()
      }

      // Bottom controls (page navigation)
      if (this.showToolbar) {
        this.ReaderBottomBar()
      }

      // TOC Panel (overlay)
      if (this.showTOC) {
        this.TOCPanel()
      }

      // Settings Panel (overlay)
      if (this.showSettings) {
        this.SettingsPanel()
      }

      // Translation Panel (bottom sheet)
      if (this.showTranslation && this.selectedText) {
        this.TranslationPanel()
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor(this.getThemeColor())
  }

  @Builder ReadingArea() {
    Column() {
      if (this.isLoading) {
        // Loading state
        Column({ space: 16 }) {
          Progress()
      .strokeWidth(4)
          Text('加载中...')
            .fontSize(14)
            .fontColor('#999999')
        }
        .width('100%')
        .height('100%')
        .justifyContent(FlexAlign.Center)
      } else {
        // Chapter content
        Scroll() {
          Column({ space: 12 }) {
            // Chapter title
            Text(this.chapters[this.currentChapterIndex]?.title || '')
              .fontSize(this.fontSize + 4)
              .fontWeight(FontWeight.Bold)
              .fontColor(this.getTextColor())
              .textAlign(TextAlign.Center)
              .padding({ bottom: 24 })

            // Chapter content (mock paragraphs)
            ForEach(Array.from({ length: 20 }), (_, index: number) => {
              Text(`这是第 ${index + 1} 段内容。Readmigo 鸿蒙原生阅读器支持 AI 翻译、划词查询、智能标注等功能。`)
                .fontSize(this.fontSize)
                .fontFamily(this.fontFamily)
                .fontColor(this.getTextColor())
                .lineHeight(this.fontSize * this.lineSpacing)
                .padding({ left: 20, right: 20, top: 8, bottom: 8 })
                .onClick(() => {
                  // Handle text selection for translation
                  // TODO: Implement proper text selection
                })
            })

            // Bottom padding
            Divider().height(100).backgroundColor(Color.Transparent)
          }
          .width('100%')
        }
        .scrollBar(BarState.Off)
        .edgeEffect(EdgeEffect.Spring)
        .width('100%')
        .height('100%')
      }
    }
    .width('100%')
    .height('100%')
  }

  @Builder ReaderToolbar() {
    Row() {
      // Left: Back button
      Row({ space: 8 }) {
        Button() {
          Image(SimpleIcon({ name: 'arrow_back', size: 24, color: '#1a1a1a' }))
            .width(24)
            .height(24)
            .fillColor(this.getTextColor())
        }
        .type(ButtonType.Circle)
        .backgroundColor('transparent')
        .onClick(() => {
          // TODO: Navigate back to library
          console.info('Back to library');
        })

        // Book title
        Text(this.book?.title || 'Loading...')
          .fontSize(16)
          .fontWeight(FontWeight.Medium)
          .fontColor(this.getTextColor())
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
      }
      .layoutWeight(1)

      // Right: Action buttons
      Row({ space: 4 }) {
        // Table of Contents
        IconButton({
          icon: SimpleIcon({ name: 'list', size: 24, color: '#1a1a1a' }),
          onClick: () => { this.showTOC = !this.showTOC; }
        })

        // Bookmark
        IconButton({
          icon: SimpleIcon({ name: 'bookmark', size: 24, color: '#1a1a1a' }),
          onClick: () => { this.addBookmark(); }
        })

        // Highlights
        IconButton({
          icon: SimpleIcon({ name: 'highlight', size: 24, color: '#1a1a1a' }),
          onClick: () => { this.showHighlights = !this.showHighlights; }
        })

        // Settings
        IconButton({
          icon: $r('app.media.settings'),
          onClick: () => { this.showSettings = !this.showSettings; }
        })
      }
    }
    .width('100%')
    .height(56)
    .padding({ left: 12, right: 12 })
    .backgroundColor(this.getToolbarBackgroundColor())
    .shadow({ radius: 4, color: '#10101020', offsetY: 2 })
    .position({ left: 0, top: 0 })
  }

  @Builder ReaderBottomBar() {
    Column() {
      // Progress bar
      Slider({
        value: this.readingProgress,
        min: 0,
        max: 100
      })
        .onChange((value: number) => {
          this.readingProgress = value;
        })
        .blockColor('#4CAF50')
        .trackBackgroundColor('#e5e5e5')
        .width('100%')
        .height(4)

      // Page info and navigation
      Row() {
        // Previous button
        Button() {
          Image($r('app.media.chevron_left'))
            .width(24)
            .height(24)
            .fillColor(this.getTextColor())
        }
        .type(ButtonType.Circle)
        .backgroundColor('transparent')
        .onClick(() => { this.prevPage(); })

        // Page indicator
        Text(`第 ${this.currentPage} / ${this.totalPages} 页`)
          .fontSize(14)
          .fontColor('#999999')
          .layoutWeight(1)
          .textAlign(TextAlign.Center)

        // Next button
        Button() {
          Image($r('app.media.chevron_right'))
            .width(24)
            .height(24)
            .fillColor(this.getTextColor())
        }
        .type(ButtonType.Circle)
        .backgroundColor('transparent')
        .onClick(() => { this.nextPage(); })

        // Reading stats
        Text(`${this.readingProgress}%`)
          .fontSize(14)
          .fontColor('#999999')
          .width(50)
          .textAlign(TextAlign.End)
      }
      .width('100%')
      .padding(12)
    }
    .backgroundColor(this.getToolbarBackgroundColor())
    .shadow({ radius: 4, color: '#10101020', offsetY: -2 })
    .position({ left: 0, bottom: 0 })
  }

  @Builder TOCPanel() {
    Column() {
      // Header
      Row() {
        Text('目录')
          .fontSize(18)
          .fontWeight(FontWeight.SemiBold)
          .fontColor(this.getTextColor())
          .layoutWeight(1)

        Button() {
          Image($r('app.media.close'))
            .width(24)
            .height(24)
            .fillColor(this.getTextColor())
        }
        .type(ButtonType.Circle)
        .backgroundColor('transparent')
        .onClick(() => { this.showTOC = false; })
      }
      .width('100%')
      .padding(16)
      .border({ width: { bottom: 1 }, color: '#e5e5e5' })

      // Chapter list
      Scroll() {
        Column() {
          ForEach(this.chapters, (chapter: Chapter, index: number) => {
            Row() {
              Text(chapter.title)
                .fontSize(16)
                .fontColor(index === this.currentChapterIndex ? '#4CAF50' : this.getTextColor())
                .fontWeight(index === this.currentChapterIndex ? FontWeight.SemiBold : FontWeight.Normal)
            }
            .width('100%')
            .padding(16)
            .backgroundColor(index === this.currentChapterIndex ? '#f5f5f5' : 'transparent')
            .onClick(() => {
              this.goToChapter(index);
              this.showTOC = false;
            })
          })
        }
      }
      .scrollBar(BarState.Off)
      .layoutWeight(1)
    }
    .width('100%')
    .height('100%')
    .backgroundColor(this.getThemeColor())
    .position({ right: 0, top: 0 })
  }

  @Builder SettingsPanel() {
    Column({ space: 20 }) {
      // Header
      Row() {
        Text('阅读设置')
          .fontSize(18)
          .fontWeight(FontWeight.SemiBold)
          .layoutWeight(1)

        Button() {
          Image($r('app.media.close'))
            .width(24)
            .height(24)
            .fillColor(this.getTextColor())
        }
        .type(ButtonType.Circle)
        .backgroundColor('transparent')
        .onClick(() => { this.showSettings = false; })
      }
      .width('100%')
      .padding(16)

      // Font size
      Column({ space: 8 }) {
        Text('字体大小')
          .fontSize(14)
          .fontColor('#666666')
        Row({ space: 16 }) {
          ForEach([14, 16, 18, 20, 22, 24], (size: number) => {
            Text(`${size}`)
              .fontSize(size)
              .fontColor(this.fontSize === size ? '#4CAF50' : '#666666')
              .padding(8)
              .backgroundColor(this.fontSize === size ? '#e8f5e9' : 'transparent')
              .borderRadius(8)
              .onClick(() => { this.fontSize = size; })
          })
        }
      }
      .width('100%')

      // Theme
      Column({ space: 8 }) {
        Text('主题')
          .fontSize(14)
          .fontColor('#666666')
        Row({ space: 12 }) {
          ThemeButton({ theme: 'light', current: this.theme, onChange: (t) => { this.theme = t; } })
          ThemeButton({ theme: 'sepia', current: this.theme, onChange: (t) => { this.theme = t; } })
          ThemeButton({ theme: 'dark', current: this.theme, onChange: (t) => { this.theme = t; } })
        }
      }
      .width('100%')

      // Line spacing
      Column({ space: 8 }) {
        Text('行间距')
          .fontSize(14)
          .fontColor('#666666')
        Slider({
          value: this.lineSpacing,
          min: 1.0,
          max: 2.5
        })
          .onChange((value: number) => { this.lineSpacing = value; })
          .blockColor('#4CAF50')
          .width('100%')
      }
      .width('100%')

      // Brightness
      Column({ space: 8 }) {
        Text('亮度')
          .fontSize(14)
          .fontColor('#666666')
        Slider({
          value: this.brightness,
          min: 0,
          max: 100
        })
          .onChange((value: number) => { this.brightness = value; })
          .blockColor('#4CAF50')
          .width('100%')
      }
      .width('100%')
    }
    .width('100%')
    .padding(16)
    .backgroundColor(this.getThemeColor())
    .position({ right: 0, bottom: 0 })
    .shadow({ radius: 8, color: '#10101030', offsetX: -4 })
  }

  @Builder TranslationPanel() {
    Column({ space: 12 }) {
      // Selected text preview
      Text(this.selectedText)
        .fontSize(14)
        .fontColor('#666666')
        .padding(12)
        .backgroundColor('#f5f5f5')
        .borderRadius(8)
        .width('100%')

      // Translation result
      if (this.isTranslating) {
        Row({ space: 8 }) {
          Progress()
      .strokeWidth(4)
          Text('翻译中...')
            .fontSize(14)
            .fontColor('#999999')
        }
      } else if (this.translation) {
        Text(this.translation)
          .fontSize(16)
          .fontColor(this.getTextColor())
          .width('100%')
      }

      // Action buttons
      Row({ space: 12 }) {
        Button('复制')
          .fontSize(14)
          .backgroundColor('transparent')
          .fontColor('#4CAF50')
          .border({ width: 1, color: '#4CAF50' })
          .onClick(() => {
            // TODO: Copy to clipboard
          })

        Button('朗读')
          .fontSize(14)
          .backgroundColor('transparent')
          .fontColor('#4CAF50')
          .border({ width: 1, color: '#4CAF50' })
          .onClick(() => {
            // TODO: TTS
          })

        Button('收藏')
          .fontSize(14)
          .backgroundColor('transparent')
          .fontColor('#4CAF50')
          .border({ width: 1, color: '#4CAF50' })
          .onClick(() => {
            // TODO: Save to vocabulary
          })

        Button('关闭')
          .fontSize(14)
          .backgroundColor('transparent')
          .fontColor('#999999')
          .onClick(() => { this.showTranslation = false; })
      }
      .width('100%')
      .justifyContent(FlexAlign.End)
    }
    .width('100%')
    .padding(16)
    .backgroundColor(this.getThemeColor())
    .border({ width: { top: 1 }, color: '#e5e5e5' })
    .position({ left: 0, bottom: 0 })
    .shadow({ radius: 8, color: '#10101030', offsetY: -4 })
  }

  getThemeColor(): string {
    switch (this.theme) {
      case 'dark': return '#1a1a1a';
      case 'sepia': return '#f4ecd8';
      default: return '#ffffff';
    }
  }

  getTextColor(): string {
    switch (this.theme) {
      case 'dark': return '#e5e5e5';
      case 'sepia': return '#5b4635';
      default: return '#1a1a1a';
    }
  }

  getToolbarBackgroundColor(): string {
    switch (this.theme) {
      case 'dark': return '#2a2a2a';
      case 'sepia': return '#e8dcc4';
      default: return '#ffffff';
    }
  }
}

// Icon Button Component
@Component
struct IconButton {
  @Prop icon: Resource = $r('app.media.settings');
  @Prop onClick: () => void = () => {};

  build() {
    Button() {
      Image(this.icon)
        .width(24)
        .height(24)
    }
    .type(ButtonType.Circle)
    .backgroundColor('transparent')
    .onClick(this.onClick)
  }
}

// Theme Button Component
@Component
struct ThemeButton {
  @Prop theme: 'light' | 'sepia' | 'dark' = 'light';
  @Prop current: string = 'light';
  @Prop onChange: (theme: 'light' | 'sepia' | 'dark') => void = () => {};

  build() {
    Button() {
      Text(this.theme === 'light' ? '日' : this.theme === 'sepia' ? '暖' : '夜')
        .fontSize(14)
        .fontColor(this.current === this.theme ? Color.White : '#666666')
    }
    .width(50)
    .height(36)
    .backgroundColor(this.current === this.theme ? '#4CAF50' : '#f5f5f5')
    .borderRadius(18)
    .onClick(() => { this.onChange(this.theme); })
  }
}

// Loading Progress Component
@Component
struct LoadingProgress {
  build() {
    Progress()
      .strokeWidth(4)
      .width(40)
      .height(40)
      .color('#4CAF50')
  }
}

// Bookmark type
interface Bookmark {
  id: string;
  chapterIndex: number;
  page: number;
  text: string;
  createdAt: Date;
  note: string;
}

// Highlight type
interface Highlight {
  id: string;
  chapterIndex: number;
  text: string;
  color: string;
  createdAt: Date;
  note?: string;
}
