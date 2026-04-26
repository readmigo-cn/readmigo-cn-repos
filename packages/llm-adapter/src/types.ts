export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface ChatResult {
  id: string;
  model: string;
  content: string;
  finishReason?: string;
  raw?: unknown;
}

export interface ProviderConfig {
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
  timeoutMs?: number;
}
