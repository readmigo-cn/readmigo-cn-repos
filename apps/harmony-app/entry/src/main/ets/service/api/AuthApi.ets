import { HttpClient } from '../HttpClient';

export interface SendCodeRequest {
  phone: string;
}

export interface LoginByCodeRequest {
  phone: string;
  code: string;
}

export interface LoginResult {
  token: string;
  refreshToken: string;
  userId: string;
}

export class AuthApi {
  static sendSmsCode(phone: string): Promise<void> {
    return HttpClient.post<void>('/auth/sms/send', { phone });
  }

  static loginByCode(phone: string, code: string): Promise<LoginResult> {
    return HttpClient.post<LoginResult>('/auth/sms/login', { phone, code });
  }

  static loginByHuawei(authCode: string): Promise<LoginResult> {
    return HttpClient.post<LoginResult>('/auth/huawei-login', { authCode });
  }

  static logout(): Promise<void> {
    return HttpClient.post<void>('/auth/logout');
  }
}
