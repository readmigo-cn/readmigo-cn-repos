/**
 * 划词解释 prompt 模板。
 * 输出 JSON：{ word, partOfSpeech, definition, example, etymology? }
 * 用 stream + JSON mode 让客户端边收边渲染。
 */

const LOCALE_INSTRUCTION: Record<string, string> = {
  'zh-CN': '请用简体中文解释',
  'zh-TW': '請用繁體中文解釋',
  en: 'Please explain in plain English',
};

export function buildExplainWordPrompt(params: {
  word: string;
  context: string;
  locale: 'zh-CN' | 'zh-TW' | 'en';
  cefrLevel: string;
}): { system: string; user: string } {
  const localeInstr = LOCALE_INSTRUCTION[params.locale] ?? LOCALE_INSTRUCTION['zh-CN'];

  const system = [
    'You are a professional English vocabulary tutor for Chinese learners.',
    `${localeInstr}.`,
    `Target reader CEFR level: ${params.cefrLevel}. Match your explanation depth to this level.`,
    '',
    'Output strict JSON ONLY (no markdown fences, no commentary), with this shape:',
    '{',
    '  "word": "<the headword>",',
    '  "partOfSpeech": "<noun|verb|adj|adv|...>",',
    '  "definition": "<concise meaning, 1-2 sentences>",',
    '  "exampleEn": "<a short example using the word>",',
    '  "exampleZh": "<Chinese translation of the example>",',
    '  "etymology": "<optional 1-line origin>"',
    '}',
    '',
    'Constraints:',
    '- Definition must reflect the meaning IN THE GIVEN CONTEXT, not generic.',
    '- Stay neutral, educational, no opinions on politics/violence/sex.',
    '- If the context is missing or the word is non-English, return {"error":"unsupported"}.',
  ].join('\n');

  const user = [
    `Word: ${params.word}`,
    `Context: ${params.context}`,
  ].join('\n');

  return { system, user };
}
