/**
 * Typesetting native bridge wrapper.
 *
 * 真实加载方式（.so ready 后启用）：
 *   import typesetting from 'libreadmigo_typesetting.so';
 *
 * 当前阶段（W1 Day 4-5）：.so 还没编入 HAP，所以本文件提供 mock 兜底，
 * 让 Reader 页面能在 ArkTS Canvas 上跑通渲染流程。
 *
 * 切换到真实 .so 时只需：
 *   1. 在 entry/oh-package.json5 加入 dependency: "libreadmigo_typesetting.so": "file:./libs/arm64-v8a/libreadmigo_typesetting.so"
 *   2. 修改 NATIVE_AVAILABLE 为 true
 */

const NATIVE_AVAILABLE: boolean = false;

export interface TextRun {
  x: number;
  y: number;
  w: number;
  fontSize: number;
  blockIndex: number;
  inlineIndex: number;
  charOffset: number;
  charLength: number;
  isLink: boolean;
  text: string;
}

export interface TextLine {
  x: number;
  y: number;
  w: number;
  h: number;
  ascent: number;
  descent: number;
  runs: TextRun[];
}

export interface PageDecoration {
  type: 'hr' | 'img' | 'table';
  x: number;
  y: number;
  w: number;
  h: number;
  src?: string;
  alt?: string;
}

export interface TypesetPage {
  pageIndex: number;
  width: number;
  height: number;
  contentX: number;
  contentY: number;
  contentWidth: number;
  contentHeight: number;
  firstBlockIndex: number;
  lastBlockIndex: number;
  lines: TextLine[];
  decorations: PageDecoration[];
}

export interface ChapterAnchor {
  pageIndex: number;
  firstBlockIndex: number;
  lastBlockIndex: number;
}

export interface HitResult {
  blockIndex: number;
  inlineIndex: number;
  charOffset: number;
  charLength: number;
  text: string;
}

export interface LayoutSummary {
  pageCount: number;
  totalBlocks: number;
  warningCount: number;
}

export interface TypesettingEngine {
  layoutHtml(html: string, chapterId: string, width: number, height: number, fontSize?: number): LayoutSummary;
  getPage(chapterId: string, pageIndex: number): TypesetPage | null;
  getChapterAnchors(chapterId: string): ChapterAnchor[];
  hitTest(chapterId: string, pageIndex: number, x: number, y: number): HitResult | null;
  destroy(): void;
}

// ----- Mock Engine（NATIVE_AVAILABLE=false 时使用） -----

class MockTypesettingEngine implements TypesettingEngine {
  private cache: Map<string, TypesetPage[]> = new Map();

  layoutHtml(html: string, chapterId: string, width: number, height: number, fontSize?: number): LayoutSummary {
    const fs = fontSize ?? 17;
    const lineHeight = fs * 1.6;
    const margin = 24;
    const contentW = width - margin * 2;
    const contentH = height - margin * 2;

    // 极简：把 HTML 拆成段，每段画几行假文字，按页溢出分页
    const paragraphs = html
      .replace(/<[^>]+>/g, '\n')
      .split(/\n+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const pages: TypesetPage[] = [];
    let pageIndex = 0;
    let cursorY = margin;
    let blockIdx = 0;
    let firstBlockOnPage = 0;
    let currentPage: TypesetPage = this.makeEmptyPage(pageIndex, width, height, margin, contentW, contentH, firstBlockOnPage);

    for (const text of paragraphs) {
      const charsPerLine = Math.max(10, Math.floor(contentW / (fs * 0.55)));
      const lines = Math.max(1, Math.ceil(text.length / charsPerLine));

      for (let li = 0; li < lines; li++) {
        if (cursorY + lineHeight > margin + contentH) {
          currentPage.lastBlockIndex = blockIdx;
          pages.push(currentPage);
          pageIndex++;
          firstBlockOnPage = blockIdx;
          cursorY = margin;
          currentPage = this.makeEmptyPage(pageIndex, width, height, margin, contentW, contentH, firstBlockOnPage);
        }
        const slice = text.slice(li * charsPerLine, (li + 1) * charsPerLine);
        const line: TextLine = {
          x: margin,
          y: cursorY + fs,
          w: slice.length * fs * 0.55,
          h: lineHeight,
          ascent: fs * 0.8,
          descent: fs * 0.2,
          runs: [{
            x: margin,
            y: cursorY + fs,
            w: slice.length * fs * 0.55,
            fontSize: fs,
            blockIndex: blockIdx,
            inlineIndex: 0,
            charOffset: li * charsPerLine,
            charLength: slice.length,
            isLink: false,
            text: slice,
          }],
        };
        currentPage.lines.push(line);
        cursorY += lineHeight;
      }
      blockIdx++;
    }
    if (currentPage.lines.length > 0) {
      currentPage.lastBlockIndex = blockIdx;
      pages.push(currentPage);
    }

    this.cache.set(chapterId, pages);
    return { pageCount: pages.length, totalBlocks: blockIdx, warningCount: 0 };
  }

  getPage(chapterId: string, pageIndex: number): TypesetPage | null {
    const pages = this.cache.get(chapterId);
    if (!pages || pageIndex < 0 || pageIndex >= pages.length) return null;
    return pages[pageIndex];
  }

  getChapterAnchors(chapterId: string): ChapterAnchor[] {
    const pages = this.cache.get(chapterId);
    if (!pages) return [];
    return pages.map((p): ChapterAnchor => ({
      pageIndex: p.pageIndex,
      firstBlockIndex: p.firstBlockIndex,
      lastBlockIndex: p.lastBlockIndex,
    }));
  }

  hitTest(chapterId: string, pageIndex: number, x: number, y: number): HitResult | null {
    const page = this.getPage(chapterId, pageIndex);
    if (!page) return null;
    for (const line of page.lines) {
      if (y < line.y - line.ascent || y > line.y + line.descent) continue;
      for (const run of line.runs) {
        if (x < run.x || x > run.x + run.w) continue;
        return {
          blockIndex: run.blockIndex,
          inlineIndex: run.inlineIndex,
          charOffset: run.charOffset,
          charLength: run.charLength,
          text: run.text,
        };
      }
    }
    return null;
  }

  destroy(): void {
    this.cache.clear();
  }

  private makeEmptyPage(
    pageIndex: number,
    w: number,
    h: number,
    margin: number,
    cw: number,
    ch: number,
    firstBlock: number,
  ): TypesetPage {
    return {
      pageIndex,
      width: w,
      height: h,
      contentX: margin,
      contentY: margin,
      contentWidth: cw,
      contentHeight: ch,
      firstBlockIndex: firstBlock,
      lastBlockIndex: firstBlock,
      lines: [],
      decorations: [],
    };
  }
}

// ----- Native Engine（NATIVE_AVAILABLE=true 时使用） -----
// 注意：当前 NATIVE_AVAILABLE=false，此类先存桩，等 .so 编入 HAP 时启用 import。
class NativeTypesettingEngine implements TypesettingEngine {
  private handle: object | null = null;

  constructor() {
    // const native: TypesettingNativeModule = globalThis['libreadmigo_typesetting'];
    // this.handle = native.createTypesettingEngine();
    throw new Error('Native typesetting not yet linked. Set NATIVE_AVAILABLE=true after .so is bundled.');
  }

  layoutHtml(_html: string, _chapterId: string, _width: number, _height: number, _fontSize?: number): LayoutSummary {
    throw new Error('not_implemented');
  }
  getPage(_chapterId: string, _pageIndex: number): TypesetPage | null { return null; }
  getChapterAnchors(_chapterId: string): ChapterAnchor[] { return []; }
  hitTest(_chapterId: string, _pageIndex: number, _x: number, _y: number): HitResult | null { return null; }
  destroy(): void { this.handle = null; }
}

export function createTypesettingEngine(): TypesettingEngine {
  return NATIVE_AVAILABLE ? new NativeTypesettingEngine() : new MockTypesettingEngine();
}
