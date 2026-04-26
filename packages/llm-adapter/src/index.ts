/**
 * LLM Adapter - Domestic China Version
 * 
 * Provides unified interface for Chinese LLM providers:
 * - DeepSeek (深度求索)
 * - Qwen (阿里云通义千问)
 * - Zhipu (智谱 AI / GLM)
 * - Wenxin (百度文心一言)
 * 
 * @example
 * ```typescript
 * import { createProvider } from '@readmigo-cn/llm-adapter';
 * 
 * const provider = createProvider('deepseek', {
 *   name: 'deepseek',
 *   apiKey: process.env.DEEPSEEK_API_KEY,
 *   defaultModel: 'deepseek-chat',
 * });
 * 
 * const result = await provider.chat([
 *   { role: 'user', content: 'Hello!' }
 * ]);
 * ```
 */

import type { LLMProvider } from './provider';
import type { ProviderConfig } from './types';
import { DeepSeekProvider } from './providers/deepseek';
import { QwenProvider } from './providers/qwen';
import { ZhipuProvider } from './providers/zhipu';
import { WenxinProvider } from './providers/wenxin';

export type SupportedProvider = 'deepseek' | 'qwen' | 'zhipu' | 'wenxin';

/**
 * Create a provider instance by name
 */
export function createProvider(
  provider: SupportedProvider,
  config: ProviderConfig,
): LLMProvider {
  switch (provider) {
    case 'deepseek':
      return new DeepSeekProvider({ ...config, name: 'deepseek' });
    case 'qwen':
      return new QwenProvider({ ...config, name: 'qwen' });
    case 'zhipu':
      return new ZhipuProvider({ ...config, name: 'zhipu' });
    case 'wenxin':
      return new WenxinProvider({ ...config, name: 'wenxin' });
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

/**
 * Create providers for all configured environment variables
 * Useful for router/fallback scenarios
 */
export function createAllProviders(env: Record<string, string | undefined>): Record<string, LLMProvider> {
  const providers: Record<string, LLMProvider> = {};

  if (env.DEEPSEEK_API_KEY) {
    providers.deepseek = createProvider('deepseek', {
      name: 'deepseek',
      apiKey: env.DEEPSEEK_API_KEY,
      baseUrl: env.DEEPSEEK_BASE_URL,
      defaultModel: env.DEEPSEEK_DEFAULT_MODEL ?? 'deepseek-chat',
    });
  }

  if (env.QWEN_API_KEY) {
    providers.qwen = createProvider('qwen', {
      name: 'qwen',
      apiKey: env.QWEN_API_KEY,
      baseUrl: env.QWEN_BASE_URL,
      defaultModel: env.QWEN_DEFAULT_MODEL ?? 'qwen-plus',
    });
  }

  if (env.ZHIPU_API_KEY) {
    providers.zhipu = createProvider('zhipu', {
      name: 'zhipu',
      apiKey: env.ZHIPU_API_KEY,
      baseUrl: env.ZHIPU_BASE_URL,
      defaultModel: env.ZHIPU_DEFAULT_MODEL ?? 'glm-4',
    });
  }

  if (env.WENXIN_API_KEY && env.WENXIN_SECRET_KEY) {
    providers.wenxin = createProvider('wenxin', {
      name: 'wenxin',
      apiKey: env.WENXIN_API_KEY,
      secretKey: env.WENXIN_SECRET_KEY,
      defaultModel: env.WENXIN_DEFAULT_MODEL ?? 'ernie-bot-4',
    });
  }

  return providers;
}

// Re-export types and providers
export * from './provider';
export * from './types';
export * from './providers/deepseek';
export * from './providers/qwen';
export * from './providers/zhipu';
export * from './providers/wenxin';
