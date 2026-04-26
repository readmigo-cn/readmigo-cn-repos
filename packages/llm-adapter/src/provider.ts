import type { ChatMessage, ChatOptions, ChatResult, StreamChunk } from './types';

/**
 * LLM Provider Interface
 * Aligned with overseas readmigo-repos BaseAIProvider abstraction
 */
export interface LLMProvider {
  /** Provider name (e.g., 'deepseek', 'qwen', 'zhipu', 'wenxin') */
  readonly name: string;
  
  /** Available models for this provider */
  readonly models: string[];
  
  /** Check if provider is available (API key configured) */
  isAvailable(): boolean;
  
  /** Non-streaming chat completion */
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResult>;
  
  /** Streaming chat completion (optional, providers can implement) */
  streamComplete?(
    messages: ChatMessage[],
    options?: ChatOptions
  ): AsyncGenerator<StreamChunk>;
}
