/**
 * LLM Adapter Types
 * Aligned with overseas readmigo-repos BaseAIProvider interface
 */

/** Chat message role */
export type ChatMessageRole = 'system' | 'user' | 'assistant';

/** Chat message structure */
export interface ChatMessage {
  role: ChatMessageRole;
  content: string;
}

/** Chat completion options */
export interface ChatOptions {
  /** Model to use */
  model?: string;
  /** Temperature (0-2, higher = more creative) */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Request timeout in milliseconds */
  timeoutMs?: number;
  /** Enable streaming */
  stream?: boolean;
}

/** Chat completion result */
export interface ChatResult {
  /** Response ID */
  id: string;
  /** Model used */
  model: string;
  /** Generated content */
  content: string;
  /** Finish reason (stop, length, etc.) */
  finishReason?: string;
  /** Token usage statistics */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Raw response from provider */
  raw?: unknown;
}

/** Streaming chunk */
export interface StreamChunk {
  /** Content in this chunk */
  content: string;
  /** Whether this is the last chunk */
  done: boolean;
  /** Input tokens used (optional, provided at end) */
  inputTokens?: number;
  /** Output tokens used (optional, provided at end) */
  outputTokens?: number;
}

/** Provider configuration */
export interface ProviderConfig {
  /** Provider name */
  name: string;
  /** API key */
  apiKey: string;
  /** Secret key (for providers like Wenxin) */
  secretKey?: string;
  /** Base URL for API */
  baseUrl?: string;
  /** Default model to use */
  defaultModel?: string;
  /** Default timeout in milliseconds */
  timeoutMs?: number;
}
