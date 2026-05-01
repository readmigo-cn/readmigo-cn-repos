import { HttpClient } from '../HttpClient';
import { SseClient } from '../SseClient';

export interface ExplainWordPayload {
  word: string;
  context: string;
  locale?: 'zh-CN' | 'zh-TW' | 'en';
  cefrLevel?: string;
}

export interface TranslatePayload {
  text: string;
  from: 'en' | 'zh';
  to: 'en' | 'zh';
}

export interface ExplainStreamHandlers {
  onChunk: (delta: string) => void;
  onDone?: () => void;
  onError?: (err: Error) => void;
}

export class AiApi {
  /**
   * 流式划词解释。SSE 数据每条是 JSON {delta?: string, done?: boolean, error?: string}。
   * 返回 stop() 函数用于中止。
   */
  static explainWordStream(payload: ExplainWordPayload, handlers: ExplainStreamHandlers): () => void {
    return SseClient.stream('/ai/explain/stream', payload, {
      onMessage: (rawData: string) => {
        try {
          const parsed = JSON.parse(rawData) as { delta?: string; done?: boolean; error?: string };
          if (parsed.error) {
            handlers.onError?.(new Error(parsed.error));
            return;
          }
          if (parsed.delta) handlers.onChunk(parsed.delta);
          if (parsed.done) handlers.onDone?.();
        } catch (_e) {
          // 不是 JSON 就当 raw 透传
          handlers.onChunk(rawData);
        }
      },
      onDone: () => handlers.onDone?.(),
      onError: (e) => handlers.onError?.(e),
    });
  }

  static translate(payload: TranslatePayload): Promise<{ translated: string }> {
    return HttpClient.post<{ translated: string }>('/ai/translate', payload);
  }
}
