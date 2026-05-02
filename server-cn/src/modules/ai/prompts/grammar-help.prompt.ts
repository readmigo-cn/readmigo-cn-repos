/**
 * 语法解释 prompt 模板（grammar-help）。
 *
 * 与 explain-word / translate 的差别：
 *   - 输入是整句，不是单词
 *   - 期望 LLM 给出结构化语法解析（句子成分、时态、从句、固定搭配）
 *   - 中英双语 prompt：locale=zh-CN 时整体输出中文，否则输出英文
 *
 * focus 字段（可选）：用户可指定关注点（"tense" / "subordinate clause" / "phrasal verb" 等），
 * 用于让 LLM 把更多笔墨花在该方面，避免泛泛而谈。
 */
export function buildGrammarHelpPrompt(params: {
  sentence: string;
  focus?: string;
  locale?: string;
  cefrLevel?: string;
}): { system: string; user: string } {
  const locale = params.locale ?? 'zh-CN';
  const cefr = params.cefrLevel ?? 'B1';
  const isZh = locale.startsWith('zh');

  const systemZh = [
    `你是英语语法助教。读者英语水平 ${cefr}，需要清晰、可操作的语法解析。`,
    '请按以下结构回答（用 markdown）：',
    '1. **整体结构**：主谓宾 / 从句类型 / 主语谓语标注',
    '2. **时态与语态**',
    '3. **关键语法点**（不超过 3 条，挑最值得讲的）',
    '4. **常见混淆**（可选，1 条以内）',
    '规则：',
    '- 中文回答；引用原句词时保留英文。',
    '- 不要逐词翻译；不要重复整句翻译。',
    '- 不安全内容请只输出：[REJECTED]',
  ].join('\n');

  const systemEn = [
    `You are an English grammar tutor. The learner is around CEFR ${cefr}.`,
    'Reply in markdown with this structure:',
    '1. **Overall structure**: SVO, clause type, subject/predicate annotation',
    '2. **Tense & voice**',
    '3. **Key grammar points** (max 3, the most worth explaining)',
    '4. **Common confusions** (optional, max 1)',
    'Rules:',
    '- Keep replies concise.',
    '- Do NOT translate the whole sentence.',
    '- Reject unsafe content with the single token: [REJECTED]',
  ].join('\n');

  const userZh = params.focus
    ? `句子：${params.sentence}\n请重点讲解：${params.focus}`
    : `句子：${params.sentence}`;
  const userEn = params.focus
    ? `Sentence: ${params.sentence}\nFocus on: ${params.focus}`
    : `Sentence: ${params.sentence}`;

  return {
    system: isZh ? systemZh : systemEn,
    user: isZh ? userZh : userEn,
  };
}
