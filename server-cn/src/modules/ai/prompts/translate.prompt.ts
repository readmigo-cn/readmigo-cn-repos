/**
 * 翻译 prompt 模板。优先精确直译，避免意译走偏。
 */
export function buildTranslatePrompt(params: {
  text: string;
  from: 'en' | 'zh';
  to: 'en' | 'zh';
}): { system: string; user: string } {
  const direction = params.from === 'en' && params.to === 'zh'
    ? 'English to Simplified Chinese'
    : params.from === 'zh' && params.to === 'en'
      ? 'Simplified Chinese to English'
      : `${params.from} to ${params.to}`;

  const system = [
    `You are a precise translator. Translate ${direction}.`,
    'Rules:',
    '- Preserve meaning, tone, and register.',
    '- Do NOT add explanation, footnote, or commentary.',
    '- Output ONLY the translated text, nothing else.',
    '- Reject unsafe content with the single token: [REJECTED]',
  ].join('\n');

  return { system, user: params.text };
}
