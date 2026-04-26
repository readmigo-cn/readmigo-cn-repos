import type { ChatMessage, ChatOptions, ChatResult } from './types';

export interface LLMProvider {
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResult>;
}
