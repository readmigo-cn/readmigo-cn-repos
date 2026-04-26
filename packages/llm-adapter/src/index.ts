import type { LLMProvider } from './provider';
import type { ProviderConfig } from './types';
import { DeepSeekProvider } from './providers/deepseek';

export type SupportedProvider = 'deepseek';

export function createProvider(
  provider: SupportedProvider,
  config: ProviderConfig,
): LLMProvider {
  switch (provider) {
    case 'deepseek':
      return new DeepSeekProvider(config);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

export * from './provider';
export * from './types';
export * from './providers/deepseek';
