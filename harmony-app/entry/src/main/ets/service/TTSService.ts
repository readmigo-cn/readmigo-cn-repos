/**
 * TTS Service - Text-to-Speech integration with domestic providers
 * 功能对齐：overseas audiolab TTS pipeline
 * 
 * Domestic Providers:
 * - 科大讯飞 (iFlytek) - Primary
 * - 阿里云 (Aliyun) - Backup
 * - 百度 (Baidu) - Backup
 * 
 * Features:
 * - Multi-voice selection
 * - Speed control
 * - Emotion/expression control
 * - Word-level timestamps
 */

export interface TTSConfig {
  provider: 'IFLYTEK' | 'ALIYUN' | 'BAIDU';
  voiceId: string;
  speed: number; // 0.5 - 3.0
  volume: number; // 0 - 1
  pitch?: number; // 0 - 2
}

export interface TTSParagraph {
  text: string;
  audioUrl?: string;
  startTime: number;
  endTime: number;
  words?: TTSWordTimestamp[];
}

export interface TTSWordTimestamp {
  word: string;
  startTime: number;
  endTime: number;
}

export interface TTSTask {
  id: string;
  bookId: string;
  chapterId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  voiceId: string;
  config: TTSConfig;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export class TTSService {
  private static config: TTSConfig = {
    provider: 'IFLYTEK',
    voiceId: 'xiaoyan', // Default 科大讯飞 female voice
    speed: 1.0,
    volume: 1.0,
    pitch: 1.0,
  };

  /**
   * Set TTS configuration
   */
  static setConfig(config: Partial<TTSConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current TTS configuration
   */
  static getConfig(): TTSConfig {
    return { ...this.config };
  }

  /**
   * Generate TTS audio for text
   * 功能对齐：overseas audiolab TTS generation
   */
  static async generateAudio(text: string): Promise<{
    audioUrl: string;
    duration: number;
    words?: TTSWordTimestamp[];
  }> {
    // TODO: Call domestic TTS API (科大讯飞)
    // For now, return mock data
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      audioUrl: 'mock-audio-url.mp3',
      duration: text.length * 0.1, // Rough estimate
      words: this.mockWordTimestamps(text),
    };
  }

  /**
   * Generate TTS for entire chapter
   */
  static async generateChapter(
    bookId: string,
    chapterId: string,
    chapterText: string
  ): Promise<TTSTask> {
    // TODO: Call server-cn TTS pipeline
    const response = await fetch('http://localhost:3000/api/v1/tts/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer TOKEN'
      },
      body: JSON.stringify({
        bookId,
        chapterId,
        text: chapterText,
        config: this.config,
      }),
    });
    return response.json();
  }

  /**
   * Get TTS task status
   */
  static async getTaskStatus(taskId: string): Promise<TTSTask> {
    const response = await fetch(`http://localhost:3000/api/v1/tts/tasks/${taskId}`);
    return response.json();
  }

  /**
   * Get available TTS voices (国内化)
   * 科大讯飞 voices
   */
  static async getAvailableVoices(): Promise<{
    id: string;
    name: string;
    gender: 'male' | 'female';
    language: string;
    provider: 'IFLYTEK' | 'ALIYUN' | 'BAIDU';
    sampleUrl?: string;
  }[]> {
    // Mock voices - 科大讯飞 popular voices
    return [
      {
        id: 'xiaoyan',
        name: '小燕',
        gender: 'female',
        language: 'zh-CN',
        provider: 'IFLYTEK',
        sampleUrl: 'https://example.com/samples/xiaoyan.mp3',
      },
      {
        id: 'jiujiu',
        name: '久久',
        gender: 'female',
        language: 'zh-CN',
        provider: 'IFLYTEK',
        sampleUrl: 'https://example.com/samples/jiujiu.mp3',
      },
      {
        id: 'zhifeng',
        name: '知风',
        gender: 'male',
        language: 'zh-CN',
        provider: 'IFLYTEK',
        sampleUrl: 'https://example.com/samples/zhifeng.mp3',
      },
      {
        id: 'xiaomei',
        name: '小美',
        gender: 'female',
        language: 'en-US',
        provider: 'IFLYTEK',
        sampleUrl: 'https://example.com/samples/xiaomei.mp3',
      },
      {
        id: 'aliyun-xiaoyun',
        name: '小云',
        gender: 'female',
        language: 'zh-CN',
        provider: 'ALIYUN',
        sampleUrl: 'https://example.com/samples/xiaoyun.mp3',
      },
      {
        id: 'baidu-chunyu',
        name: '春宇',
        gender: 'male',
        language: 'zh-CN',
        provider: 'BAIDU',
        sampleUrl: 'https://example.com/samples/chunyu.mp3',
      },
    ];
  }

  /**
   * Format duration from seconds to MM:SS or HH:MM:SS
   */
  static formatDuration(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Format time for player display
   */
  static formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Mock word timestamps for demo
   */
  private static mockWordTimestamps(text: string): TTSWordTimestamp[] {
    const words = text.split(/\s+/);
    const result: TTSWordTimestamp[] = [];
    let currentTime = 0;

    words.forEach(word => {
      const wordDuration = word.length * 0.15; // Rough estimate
      result.push({
        word,
        startTime: currentTime,
        endTime: currentTime + wordDuration,
      });
      currentTime += wordDuration;
    });

    return result;
  }
}
