import http from '@ohos.net.http';
import { ApiConfig } from './ApiConfig';
import { UserStore } from '../store/UserStore';

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export class ApiError extends Error {
  code: number;
  httpStatus: number;
  constructor(code: number, message: string, httpStatus: number) {
    super(message);
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

interface RequestOptions {
  method?: http.RequestMethod;
  headers?: Record<string, string>;
  body?: object;
  query?: Record<string, string | number>;
  timeoutMs?: number;
  auth?: boolean;
}

/**
 * HTTP client based on @ohos.net.http.
 * - 自动加 Authorization
 * - 统一 ApiResponse<T> 解包
 * - 401 触发登出
 */
export class HttpClient {
  static async request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const url = HttpClient.buildUrl(path, opts.query);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept-Language': 'zh-CN',
      ...(opts.headers ?? {}),
    };
    if (opts.auth !== false) {
      const token = UserStore.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const httpRequest = http.createHttp();
    try {
      const resp = await httpRequest.request(url, {
        method: opts.method ?? http.RequestMethod.GET,
        header: headers,
        extraData: opts.body ? JSON.stringify(opts.body) : undefined,
        connectTimeout: opts.timeoutMs ?? ApiConfig.timeoutMs,
        readTimeout: opts.timeoutMs ?? ApiConfig.timeoutMs,
      });
      return HttpClient.handleResponse<T>(resp);
    } catch (err) {
      const e = err as Error;
      throw new ApiError(-1, e.message ?? 'network_error', 0);
    } finally {
      httpRequest.destroy();
    }
  }

  static get<T>(path: string, query?: Record<string, string | number>): Promise<T> {
    return HttpClient.request<T>(path, { method: http.RequestMethod.GET, query });
  }

  static post<T>(path: string, body?: object): Promise<T> {
    return HttpClient.request<T>(path, { method: http.RequestMethod.POST, body });
  }

  static put<T>(path: string, body?: object): Promise<T> {
    return HttpClient.request<T>(path, { method: http.RequestMethod.PUT, body });
  }

  static delete<T>(path: string): Promise<T> {
    return HttpClient.request<T>(path, { method: http.RequestMethod.DELETE });
  }

  private static buildUrl(path: string, query?: Record<string, string | number>): string {
    const base = ApiConfig.baseUrl.replace(/\/$/, '');
    const p = path.startsWith('/') ? path : `/${path}`;
    if (!query || Object.keys(query).length === 0) {
      return `${base}${p}`;
    }
    const qs = Object.keys(query)
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(String(query[k]))}`)
      .join('&');
    return `${base}${p}?${qs}`;
  }

  private static handleResponse<T>(resp: http.HttpResponse): T {
    const status = resp.responseCode;
    if (status === 401) {
      UserStore.clear();
      throw new ApiError(401, 'unauthorized', 401);
    }
    if (status < 200 || status >= 300) {
      throw new ApiError(status, `http_${status}`, status);
    }
    const text = typeof resp.result === 'string'
      ? resp.result
      : new TextDecoder('utf-8').decode(resp.result as ArrayBuffer);
    let parsed: ApiResponse<T>;
    try {
      parsed = JSON.parse(text) as ApiResponse<T>;
    } catch (_e) {
      throw new ApiError(-2, 'invalid_json', status);
    }
    if (parsed.code !== 0 && parsed.code !== 200) {
      throw new ApiError(parsed.code, parsed.message ?? 'api_error', status);
    }
    return parsed.data;
  }
}
