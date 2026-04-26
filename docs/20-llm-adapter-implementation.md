# 国内版 LLM Adapter 实现方案

> 参考海外版 `api/src/modules/ai/` 架构，适配国产 LLM 提供商
> 创建时间：2026-04-26

---

## 1. 架构设计

### 1.1 核心模式

采用 **Provider Abstraction + Router Pattern**，与海外版保持一致：

```
┌─────────────────────────────────────────────────────────┐
│                  @readmigo-cn/llm-adapter                │
├─────────────────────────────────────────────────────────┤
│  LLMProvider Interface (chat + streamComplete)          │
├─────────────────────────────────────────────────────────┤
│  Providers:                                              │
│  ├─ DeepSeekProvider  (deepseek-chat, deepseek-coder)   │
│  ├─ QwenProvider      (通义千问：qwen-max, qwen-plus)   │
│  ├─ ZhipuProvider     (智谱 AI: glm-4, glm-3-turbo)     │
│  └─ WenxinProvider    (文心一言：ernie-bot-4)          │
├─────────────────────────────────────────────────────────┤
│  Router Service (task-based routing + fallback)         │
│  Cache Service (Redis with TTL)                         │
│  Prompt Templates (word explain, QA, translation)       │
└─────────────────────────────────────────────────────────┘
```

### 1.2 设计原则

1. **功能对齐**: 保持与海外版 `BaseAIProvider` 接口一致
2. **国内适配**: 仅接入国产 LLM 提供商
3. **渐进实现**: Phase 1 先实现 chat + streaming，Phase 2 加 router + cache

---

## 2. Provider 接口定义

### 2.1 核心类型 (`src/types.ts`)

```typescript
// 消息格式
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// 配置选项
export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  stream?: boolean;
}

// 单次对话结果
export interface ChatResult {
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

// 流式分块
export interface StreamChunk {
  content: string;
  done: boolean;
  inputTokens?: number;
  outputTokens?: number;
}

// Provider 接口 (对齐海外 BaseAIProvider)
export interface LLMProvider {
  readonly name: string;
  readonly models: string[];
  
  isAvailable(): boolean;
  
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResult>;
  
  streamComplete?(
    messages: ChatMessage[], 
    options?: ChatOptions
  ): AsyncGenerator<StreamChunk>;
}
```

### 2.2 与海外版对比

| 字段 | 海外版 (`BaseAIProvider`) | 国内版 (`LLMProvider`) | 说明 |
|------|--------------------------|------------------------|------|
| 消息类型 | `AIMessage` | `ChatMessage` | 保持命名一致 |
| 流式分块 | `AIStreamChunk` | `StreamChunk` | 简化命名 |
| 完成结果 | `AICompletionResult` | `ChatResult` | 简化命名 |
| 接口方法 | `complete()` + `streamComplete()` | `chat()` + `streamComplete()` | 命名对齐 OpenAI |

---

## 3. Provider 实现

### 3.1 DeepSeek Provider (已存在，需扩展)

**文件**: `src/providers/deepseek.ts`

**扩展内容**:
1. 添加 `name` 和 `models` 属性
2. 添加 `isAvailable()` 方法
3. 实现 `streamComplete()` 流式方法

```typescript
export class DeepSeekProvider implements LLMProvider {
  readonly name = 'deepseek';
  readonly models = ['deepseek-chat', 'deepseek-coder'];
  
  private apiKey: string;
  private baseUrl: string;
  
  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.deepseek.com/v1';
  }
  
  isAvailable(): boolean {
    return !!this.apiKey;
  }
  
  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResult> {
    // ... existing implementation ...
  }
  
  async *streamComplete(
    messages: ChatMessage[],
    options: ChatOptions = {}
  ): AsyncGenerator<StreamChunk> {
    // 参考海外版 deepseek.provider.ts 的 streamComplete 实现
    // SSE 格式解析：data: {"choices":[{"delta":{"content":"..."}}]}
  }
}
```

### 3.2 Qwen Provider (阿里云百炼)

**文件**: `src/providers/qwen.ts`

```typescript
export class QwenProvider implements LLMProvider {
  readonly name = 'qwen';
  readonly models = ['qwen-max', 'qwen-plus', 'qwen-turbo'];
  
  private apiKey: string;
  private baseUrl: string;
  
  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey;
    // 阿里云百炼兼容 OpenAI 格式
    this.baseUrl = config.baseUrl ?? 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  }
  
  isAvailable(): boolean {
    return !!this.apiKey;
  }
  
  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResult> {
    // 阿里云百炼 API 兼容 OpenAI 格式
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model ?? 'qwen-plus',
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2048,
        stream: false,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Qwen API error: ${response.status} ${error}`);
    }
    
    const data = await response.json();
    return {
      id: data.id,
      model: data.model,
      content: data.choices[0]?.message?.content ?? '',
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
      raw: data,
    };
  }
  
  async *streamComplete(
    messages: ChatMessage[],
    options: ChatOptions = {}
  ): AsyncGenerator<StreamChunk> {
    // 参考 DeepSeek streamComplete 实现
  }
}
```

### 3.3 Zhipu Provider (智谱 AI)

**文件**: `src/providers/zhipu.ts`

```typescript
export class ZhipuProvider implements LLMProvider {
  readonly name = 'zhipu';
  readonly models = ['glm-4', 'glm-3-turbo', 'glm-4-flash'];
  
  private apiKey: string;
  private baseUrl: string;
  
  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey;
    // 智谱 AI 兼容 OpenAI 格式
    this.baseUrl = config.baseUrl ?? 'https://open.bigmodel.cn/api/paas/v4';
  }
  
  isAvailable(): boolean {
    return !!this.apiKey;
  }
  
  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResult> {
    // 智谱 AI API 兼容 OpenAI 格式
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model ?? 'glm-4',
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2048,
        stream: false,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Zhipu API error: ${response.status} ${error}`);
    }
    
    const data = await response.json();
    return {
      id: data.id,
      model: data.model,
      content: data.choices[0]?.message?.content ?? '',
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
      raw: data,
    };
  }
  
  async *streamComplete(
    messages: ChatMessage[],
    options: ChatOptions = {}
  ): AsyncGenerator<StreamChunk> {
    // 参考 DeepSeek streamComplete 实现
  }
}
```

### 3.4 Wenxin Provider (百度文心一言)

**文件**: `src/providers/wenxin.ts`

```typescript
export class WenxinProvider implements LLMProvider {
  readonly name = 'wenxin';
  readonly models = ['ernie-bot-4', 'ernie-bot-turbo', 'ernie-bot-8k'];
  
  private apiKey: string;
  private secretKey: string;
  
  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey;
    this.secretKey = config.secretKey ?? '';
  }
  
  isAvailable(): boolean {
    return !!this.apiKey && !!this.secretKey;
  }
  
  private async getAccessToken(): Promise<string> {
    const response = await fetch(
      `https://aip.baidubce.com/oauth/2.0/token?` +
      `grant_type=client_credentials&client_id=${this.apiKey}&client_secret=${this.secretKey}`
    );
    const data = await response.json();
    return data.access_token;
  }
  
  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResult> {
    const accessToken = await this.getAccessToken();
    const response = await fetch(
      `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/ernie_bot_4?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          temperature: options.temperature ?? 0.7,
          max_output_tokens: options.maxTokens ?? 2048,
        }),
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Wenxin API error: ${response.status} ${error}`);
    }
    
    const data = await response.json();
    return {
      id: data.id ?? 'wenxin-chat',
      model: options.model ?? 'ernie-bot-4',
      content: data.result ?? '',
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
      raw: data,
    };
  }
}
```

---

## 4. Router Service (Phase 2)

### 4.1 任务类型定义

```typescript
export enum AITaskType {
  // 用户实时请求
  WORD_EXPLAIN = 'word_explain',
  CONTENT_QA = 'content_qa',
  SENTENCE_TRANSLATE = 'sentence_translate',
  
  // 批处理任务
  BATCH_BOOK_SUMMARY = 'batch_book_summary',
  BATCH_CHAPTER_SUMMARY = 'batch_chapter_summary',
  BATCH_TRANSLATE_ZH = 'batch_translate_zh',
}
```

### 4.2 路由配置

```typescript
interface RouteConfig {
  primary: { provider: string; model: string };
  fallback: { provider: string; model: string };
  costLevel: 'low' | 'medium' | 'high';
}

const routeConfig: Record<AITaskType, RouteConfig> = {
  [AITaskType.WORD_EXPLAIN]: {
    primary: { provider: 'deepseek', model: 'deepseek-chat' },
    fallback: { provider: 'zhipu', model: 'glm-4' },
    costLevel: 'low',
  },
  [AITaskType.SENTENCE_TRANSLATE]: {
    primary: { provider: 'qwen', model: 'qwen-plus' }, // 中文翻译最优
    fallback: { provider: 'deepseek', model: 'deepseek-chat' },
    costLevel: 'low',
  },
  [AITaskType.BATCH_TRANSLATE_ZH]: {
    primary: { provider: 'qwen', model: 'qwen-plus' },
    fallback: { provider: 'wenxin', model: 'ernie-bot-4' },
    costLevel: 'low',
  },
};
```

---

## 5. Caching Service (Phase 2)

### 5.1 缓存策略

```typescript
const CACHE_TTL = {
  CONTENT: 90 * 24 * 3600,    // 生词解释、翻译 (90 天)
  BOOK: 180 * 24 * 3600,      // 图书摘要、分析 (180 天)
  PERMANENT: 365 * 24 * 3600, // 作者信息、词族 (365 天)
};

// 缓存键模式
const cacheKey = `ai:v1:word:${word.toLowerCase()}:${sentence.slice(0, 50)}:${englishLevel}`;
```

### 5.2 Redis 集成

```typescript
export class AICacheService {
  constructor(private redis: Redis) {}
  
  async get<T>(key: string): Promise<T | null> {
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached);
    return null;
  }
  
  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }
}
```

---

## 6. Prompt Templates (Phase 2)

### 6.1 生词解释 Prompt

```typescript
export function buildWordExplainPrompt(context: WordExplainContext): ChatMessage[] {
  const levelGuide = {
    BEGINNER: 'very simple words and short sentences',
    ELEMENTARY: 'basic vocabulary and simple sentence structures',
    INTERMEDIATE: 'common vocabulary with some complexity',
    UPPER_INTERMEDIATE: 'varied vocabulary and complex structures',
    ADVANCED: 'sophisticated vocabulary and nuanced expressions',
  };

  return [
    {
      role: 'system',
      content: `You are a helpful English learning assistant. Explain words using ${levelGuide[context.level]}.`,
    },
    {
      role: 'user',
      content: `Please explain the word "${context.word}" as used in: "${context.sentence}"`,
    },
  ];
}
```

---

## 7. 目录结构

```
packages/llm-adapter/
├── src/
│   ├── types.ts                  # 核心类型定义
│   ├── provider.ts               # LLMProvider 接口
│   ├── providers/
│   │   ├── deepseek.ts           # DeepSeek 实现
│   │   ├── qwen.ts               # Qwen 实现
│   │   ├── zhipu.ts              # Zhipu 实现
│   │   └── wenxin.ts             # Wenxin 实现
│   ├── router.ts                 # Router Service (Phase 2)
│   ├── cache.ts                  # Cache Service (Phase 2)
│   ├── prompts/
│   │   ├── word-explain.ts       # 生词解释 Prompt
│   │   ├── content-qa.ts         # 内容问答 Prompt
│   │   └── translation.ts        # 翻译 Prompt
│   └── index.ts                  # 工厂函数 + 导出
├── package.json
└── README.md
```

---

## 8. 环境变量

```bash
# .env.example

# DeepSeek
DEEPSEEK_API_KEY=sk_xxxxxxxxxxxxx

# Qwen (阿里云百炼)
QWEN_API_KEY=dashscope_xxxxxxxxxxxxx
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

# Zhipu (智谱 AI)
ZHIPU_API_KEY=xxxxxxxxxxxxx
ZHIPU_BASE_URL=https://open.bigmodel.cn/api/paas/v4

# Wenxin (百度)
WENXIN_API_KEY=xxxxxxxxxxxxx
WENXIN_SECRET_KEY=xxxxxxxxxxxxx

# Redis (缓存)
REDIS_URL=redis://localhost:6379
```

---

## 9. 实现计划

### Phase 1 (Week 1-2): 基础 Provider
- [ ] 扩展 `DeepSeekProvider` (添加 `isAvailable()`, `streamComplete()`)
- [ ] 实现 `QwenProvider`
- [ ] 实现 `ZhipuProvider`
- [ ] 实现 `WenxinProvider`
- [ ] 更新 `createProvider()` 工厂函数

### Phase 2 (Week 3-4): Router + Cache
- [ ] 实现 `AIRouterService` (任务路由 + fallback)
- [ ] 实现 `AICacheService` (Redis 缓存)
- [ ] 添加 Prompt templates
- [ ] 集成到 `server-cn`

---

## 10. 与海外版对比

| 功能 | 海外版 | 国内版 | 说明 |
|------|--------|--------|------|
| Provider 接口 | `BaseAIProvider` (abstract class) | `LLMProvider` (interface) | 更轻量的 interface |
| Provider 数量 | 4 (OpenAI, Anthropic, DeepSeek, Qwen) | 4 (DeepSeek, Qwen, Zhipu, Wenxin) | 全国产 |
| 路由策略 | Primary + Fallback + Emergency | Primary + Fallback | 简化逻辑 |
| 缓存 | Redis (90d/180d/365d) | Redis (90d/180d/365d) | 保持一致 |
| Prompt 模板 | 10+ | 3+ (Phase 1) | 渐进实现 |
| Streaming | ✅ SSE | ✅ SSE | 保持一致 |

---

## 11. 下一步

1. **立即执行**: 扩展 DeepSeek Provider + 实现 Qwen Provider
2. **本周完成**: 所有 4 个 Provider + 工厂函数
3. **下周完成**: Router + Cache + Prompt templates
4. **集成到 server-cn**: 创建 `/ai/explain`, `/ai/translate` 端点
