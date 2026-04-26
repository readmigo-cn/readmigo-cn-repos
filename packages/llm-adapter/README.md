# @readmigo-cn/llm-adapter

LLM adapter layer for Readmigo China (阅可), providing unified interface for Chinese AI providers.

## Features

- ✅ **Unified Interface** - Same API for all providers
- ✅ **Multiple Providers** - DeepSeek, Qwen (阿里云), Zhipu (智谱), Wenxin (百度)
- ✅ **Streaming Support** - SSE streaming for real-time responses
- ✅ **Smart Fallback** - Automatic retry with backup providers
- ✅ **Type Safe** - Full TypeScript support

## Installation

```bash
pnpm add @readmigo-cn/llm-adapter
```

## Quick Start

### Single Provider

```typescript
import { createProvider } from '@readmigo-cn/llm-adapter';

const provider = createProvider('deepseek', {
  name: 'deepseek',
  apiKey: process.env.DEEPSEEK_API_KEY,
  defaultModel: 'deepseek-chat',
});

// Non-streaming
const result = await provider.chat([
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Hello!' }
]);

console.log(result.content);

// Streaming
for await (const chunk of provider.streamComplete([
  { role: 'user', content: 'Tell me a story' }
])) {
  if (!chunk.done) {
    process.stdout.write(chunk.content);
  }
}
```

### Multiple Providers

```typescript
import { createAllProviders } from '@readmigo-cn/llm-adapter';

const providers = createAllProviders(process.env);

// Access specific provider
const deepseek = providers.deepseek;
const qwen = providers.qwen;
```

## Environment Variables

```bash
# DeepSeek
DEEPSEEK_API_KEY=sk_xxxxxxxxxxxxx
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_DEFAULT_MODEL=deepseek-chat

# Qwen (阿里云百炼)
QWEN_API_KEY=dashscope_xxxxxxxxxxxxx
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_DEFAULT_MODEL=qwen-plus

# Zhipu (智谱 AI)
ZHIPU_API_KEY=xxxxxxxxxxxxx
ZHIPU_BASE_URL=https://open.bigmodel.cn/api/paas/v4
ZHIPU_DEFAULT_MODEL=glm-4

# Wenxin (百度文心一言)
WENXIN_API_KEY=xxxxxxxxxxxxx
WENXIN_SECRET_KEY=xxxxxxxxxxxxx
WENXIN_DEFAULT_MODEL=ernie-bot-4
```

## Supported Providers

| Provider | Company | Models | Streaming |
|----------|---------|--------|-----------|
| `deepseek` | 深度求索 | deepseek-chat, deepseek-coder, deepseek-v3 | ✅ |
| `qwen` | 阿里云 | qwen-max, qwen-plus, qwen-turbo | ✅ |
| `zhipu` | 智谱 AI | glm-4, glm-4-plus, glm-4-flash | ✅ |
| `wenxin` | 百度 | ernie-bot-4, ernie-bot-turbo | ❌ (fallback) |

## API Reference

### `createProvider(name, config)`

Create a provider instance.

```typescript
function createProvider(
  provider: 'deepseek' | 'qwen' | 'zhipu' | 'wenxin',
  config: ProviderConfig
): LLMProvider
```

### `LLMProvider` interface

```typescript
interface LLMProvider {
  readonly name: string;
  readonly models: string[];
  isAvailable(): boolean;
  
  chat(
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<ChatResult>;
  
  streamComplete?(
    messages: ChatMessage[],
    options?: ChatOptions
  ): AsyncGenerator<StreamChunk>;
}
```

### `ChatMessage`

```typescript
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
```

### `ChatOptions`

```typescript
interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  stream?: boolean;
}
```

### `ChatResult`

```typescript
interface ChatResult {
  id: string;
  model: string;
  content: string;
  finishReason?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  raw?: unknown;
}
```

### `StreamChunk`

```typescript
interface StreamChunk {
  content: string;
  done: boolean;
  inputTokens?: number;
  outputTokens?: number;
}
```

## Architecture

This adapter follows the same pattern as the overseas readmigo-repos `BaseAIProvider`:

```
┌─────────────────────────────────────────┐
│          @readmigo-cn/llm-adapter        │
├─────────────────────────────────────────┤
│  LLMProvider Interface                   │
├─────────────────────────────────────────┤
│  Providers:                              │
│  ├─ DeepSeekProvider                     │
│  ├─ QwenProvider                         │
│  ├─ ZhipuProvider                        │
│  └─ WenxinProvider                       │
└─────────────────────────────────────────┘
```

## License

MIT © Readmigo CN Team
