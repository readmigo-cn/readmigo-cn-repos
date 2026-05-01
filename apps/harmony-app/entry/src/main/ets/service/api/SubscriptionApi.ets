import { HttpClient } from '../HttpClient';

export type SubscriptionPlan = 'pro_monthly' | 'pro_yearly' | 'premium_monthly';
export type SubscriptionStatus = 'pending' | 'active' | 'cancelled' | 'expired' | 'failed';

export interface SubscriptionInfo {
  isPro: boolean;
  subscription: {
    id: string;
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    startedAt: string | null;
    expiresAt: string | null;
  } | null;
}

export interface VerifyIapPayload {
  productId: string;
  plan: SubscriptionPlan;
  purchaseToken: string;
  rawReceipt: string;
}

export class SubscriptionApi {
  static me(): Promise<SubscriptionInfo> {
    return HttpClient.get<SubscriptionInfo>('/subscription/me');
  }

  static verify(payload: VerifyIapPayload): Promise<object> {
    return HttpClient.post<object>('/subscription/verify', payload);
  }

  static cancel(): Promise<void> {
    return HttpClient.post<void>('/subscription/cancel');
  }
}
