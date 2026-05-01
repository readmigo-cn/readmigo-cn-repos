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

/**
 * NATIVE_AVAILABLE flips to true once libreadmigo_typesetting.so is bundled.
 * 切换步骤：
 *   1. 在 DevEco Studio 里 Build → Make HAP，确认 entry/libs/arm64-v8a/ 出现 libreadmigo_typesetting.so
 *   2. 把下面的 false 改成 true
 *   3. Reader 页会自动切到真实 native 引擎
 *
 * tryLoadNative 会捕获加载失败并 fallback 到 mock，所以即使 .so 缺失也不会闪退。
 */
let NATIVE_AVAILABLE: boolean = false;

interface NativeTypesettingModule {
  createTypesettingEngine(): object;
  destroyTypesettingEngine(handle: object): void;
  layoutHtml(handle: object, html: string, chapterId: string, w: number, h: number, fs?: number): LayoutSummary;
  getPageJson(handle: object, chapterId: string, pageIndex: number): string | null;
  getChapterAnchorsJson(handle: object, chapterId: string): string | null;
  hitTestJson(handle: object, chapterId: string, pageIndex: number, x: number, y: number): string | null;
}

let cachedNativeModule: NativeTypesettingModule | null = null;

function tryLoadNative(): NativeTypesettingModule | null {
  if (cachedNativeModule) return cachedNativeModule;
  if (!NATIVE_AVAILABLE) return null;
  try {
    // 真实加载（ohos NAPI 模块）。.so 没 ready 时此 import 会抛错，被 catch 后降级 mock。
    // @ts-ignore — 仅在 .so 进 HAP 后才能解析
    const mod: NativeTypesettingModule = globalThis['requireNapi']
      ? globalThis['requireNapi']('libreadmigo_typesetting.so')
      : null;
    if (mod && typeof mod.createTypesettingEngine === 'function') {
      cachedNativeModule = mod;
      return mod;
    }
  } catch (_e) {
    // fall through to mock
  }
  NATIVE_AVAILABLE = false;
  return null;
}

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
        // 字符精度命中：按比例估算被点字符位置
        let charIdx = 0;
        if (run.charLength > 0 && run.w > 0) {
          const ratio = (x - run.x) / run.w;
          charIdx = Math.floor(ratio * run.charLength);
          if (charIdx >= run.text.length) charIdx = run.text.length - 1;
          if (charIdx < 0) charIdx = 0;
        }
        const bounds = MockTypesettingEngine.findWordBounds(run.text, charIdx);
        return {
          blockIndex: run.blockIndex,
          inlineIndex: run.inlineIndex,
          charOffset: run.charOffset + bounds.start,
          charLength: bounds.length,
          text: run.text.slice(bounds.start, bounds.start + bounds.length),
        };
      }
    }
    return null;
  }

  /** 在 text 中找包含 charIdx 的英文词边界（字母/撇号/连字符）。 */
  private static findWordBounds(text: string, charIdx: number): { start: number; length: number } {
    if (!text) return { start: 0, length: 0 };
    if (charIdx < 0) charIdx = 0;
    if (charIdx >= text.length) charIdx = text.length - 1;

    const isWordChar = (c: string): boolean => /[A-Za-z'\-]/.test(c);

    if (!isWordChar(text[charIdx])) {
      let found = false;
      for (let d = 1; d <= 8 && !found; d++) {
        if (charIdx - d >= 0 && isWordChar(text[charIdx - d])) {
          charIdx -= d;
          found = true;
        } else if (charIdx + d < text.length && isWordChar(text[charIdx + d])) {
          charIdx += d;
          found = true;
        }
      }
      if (!found) return { start: charIdx, length: 1 };
    }

    let start = charIdx;
    while (start > 0 && isWordChar(text[start - 1])) start--;
    let end = charIdx;
    while (end + 1 < text.length && isWordChar(text[end + 1])) end++;
    return { start, length: end - start + 1 };
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

// ----- Native Engine（.so ready 后启用） -----

class NativeTypesettingEngine implements TypesettingEngine {
  private handle: object | null = null;
  private mod: NativeTypesettingModule;

  constructor(mod: NativeTypesettingModule) {
    this.mod = mod;
    this.handle = mod.createTypesettingEngine();
  }

  layoutHtml(html: string, chapterId: string, width: number, height: number, fontSize?: number): LayoutSummary {
    if (!this.handle) throw new Error('engine_destroyed');
    return this.mod.layoutHtml(this.handle, html, chapterId, width, height, fontSize);
  }

  getPage(chapterId: string, pageIndex: number): TypesetPage | null {
    if (!this.handle) return null;
    const json = this.mod.getPageJson(this.handle, chapterId, pageIndex);
    if (!json) return null;
    try {
      return JSON.parse(json) as TypesetPage;
    } catch (_e) {
      return null;
    }
  }

  getChapterAnchors(chapterId: string): ChapterAnchor[] {
    if (!this.handle) return [];
    const json = this.mod.getChapterAnchorsJson(this.handle, chapterId);
    if (!json) return [];
    try {
      return JSON.parse(json) as ChapterAnchor[];
    } catch (_e) {
      return [];
    }
  }

  hitTest(chapterId: string, pageIndex: number, x: number, y: number): HitResult | null {
    if (!this.handle) return null;
    const json = this.mod.hitTestJson(this.handle, chapterId, pageIndex, x, y);
    if (!json) return null;
    try {
      return JSON.parse(json) as HitResult;
    } catch (_e) {
      return null;
    }
  }

  destroy(): void {
    if (this.handle) {
      this.mod.destroyTypesettingEngine(this.handle);
      this.handle = null;
    }
  }
}

export function createTypesettingEngine(): TypesettingEngine {
  const native = tryLoadNative();
  if (native) {
    try {
      return new NativeTypesettingEngine(native);
    } catch (_e) {
      // native init failed, fall back to mock
    }
  }
  return new MockTypesettingEngine();
}
