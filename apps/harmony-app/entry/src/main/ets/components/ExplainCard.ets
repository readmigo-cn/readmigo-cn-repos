import { AppColors } from '../theme/AppColors';
import { AppFontSize, AppFontWeight } from '../theme/AppTypography';
import { AppSpacing, AppRadius } from '../theme/AppSpacing';

export interface StructuredExplain {
  word: string;
  partOfSpeech?: string;
  definition: string;
  exampleEn?: string;
  exampleZh?: string;
  etymology?: string;
}

/**
 * 解析 DeepSeek prompt 模板要求的 JSON 输出（参见 server-cn explain-word.prompt.ts）。
 * 容错：去掉可能的 ```json``` fence、首尾空白；解析失败返回 null。
 */
export function parseExplainJson(raw: string): StructuredExplain | null {
  if (!raw) return null;
  let s = raw.trim();
  // 去 markdown fence
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '');
    s = s.trim();
  }
  // 找第一个 { 到最后一个 }
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first < 0 || last <= first) return null;
  s = s.slice(first, last + 1);
  try {
    const obj = JSON.parse(s) as Record<string, unknown>;
    if (typeof obj.error === 'string') return null;
    if (typeof obj.definition !== 'string' || obj.definition.length === 0) return null;
    return {
      word: String(obj.word ?? ''),
      partOfSpeech: obj.partOfSpeech ? String(obj.partOfSpeech) : undefined,
      definition: String(obj.definition),
      exampleEn: obj.exampleEn ? String(obj.exampleEn) : undefined,
      exampleZh: obj.exampleZh ? String(obj.exampleZh) : undefined,
      etymology: obj.etymology ? String(obj.etymology) : undefined,
    };
  } catch (_e) {
    return null;
  }
}

@Component
export struct ExplainCard {
  data: StructuredExplain = { word: '', definition: '' };

  build() {
    Column({ space: AppSpacing.base }) {
      // 词头 + 词性
      Row({ space: AppSpacing.sm }) {
        Text(this.data.word)
          .fontSize(AppFontSize.lg)
          .fontWeight(AppFontWeight.bold)
          .fontColor(AppColors.textPrimary)
        if (this.data.partOfSpeech && this.data.partOfSpeech.length > 0) {
          Text(this.data.partOfSpeech)
            .fontSize(AppFontSize.xs)
            .fontColor(AppColors.brand)
            .padding({ left: AppSpacing.xs, right: AppSpacing.xs, top: 2, bottom: 2 })
            .borderRadius(AppRadius.sm)
            .backgroundColor('#E8F5E9')
        }
      }
      .width('100%')

      // 释义块
      Column({ space: AppSpacing.xs }) {
        Text('释义')
          .fontSize(AppFontSize.xs)
          .fontColor(AppColors.textTertiary)
        Text(this.data.definition)
          .fontSize(AppFontSize.base)
          .fontColor(AppColors.textPrimary)
          .lineHeight(22)
      }
      .alignItems(HorizontalAlign.Start)
      .width('100%')

      // 例句块
      if (this.data.exampleEn && this.data.exampleEn.length > 0) {
        Column({ space: AppSpacing.xs }) {
          Text('例句')
            .fontSize(AppFontSize.xs)
            .fontColor(AppColors.textTertiary)
          Text(this.data.exampleEn)
            .fontSize(AppFontSize.sm)
            .fontStyle(FontStyle.Italic)
            .fontColor(AppColors.textPrimary)
            .lineHeight(20)
          if (this.data.exampleZh && this.data.exampleZh.length > 0) {
            Text(this.data.exampleZh)
              .fontSize(AppFontSize.sm)
              .fontColor(AppColors.textSecondary)
              .lineHeight(20)
          }
        }
        .alignItems(HorizontalAlign.Start)
        .width('100%')
        .padding(AppSpacing.sm)
        .backgroundColor(AppColors.bgSecondary)
        .borderRadius(AppRadius.base)
      }

      // 词源块
      if (this.data.etymology && this.data.etymology.length > 0) {
        Column({ space: AppSpacing.xs }) {
          Text('词源')
            .fontSize(AppFontSize.xs)
            .fontColor(AppColors.textTertiary)
          Text(this.data.etymology)
            .fontSize(AppFontSize.sm)
            .fontColor(AppColors.textSecondary)
            .lineHeight(20)
        }
        .alignItems(HorizontalAlign.Start)
        .width('100%')
      }
    }
    .width('100%')
    .alignItems(HorizontalAlign.Start)
  }
}
