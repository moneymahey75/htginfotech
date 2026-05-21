import { invokeSupabaseFunction } from './supabase';

export interface TurnstileConfig {
  siteKey: string;
  enabled: boolean;
  usingTestKey?: boolean;
}

let configPromise: Promise<TurnstileConfig> | null = null;

export const getTurnstileConfig = async (): Promise<TurnstileConfig> => {
  if (!configPromise) {
    configPromise = (async () => {
      const { data, error } = await invokeSupabaseFunction('get-turnstile-config', {
        body: {},
      });

      if (error) {
        throw new Error(error.message || 'Failed to load Cloudflare Turnstile configuration.');
      }

      if (!data?.success || !data?.siteKey) {
        throw new Error(data?.error || 'Cloudflare Turnstile is not configured.');
      }

      return {
        siteKey: String(data.siteKey),
        enabled: Boolean(data.enabled),
        usingTestKey: Boolean(data.usingTestKey),
      };
    })();
  }

  return configPromise;
};

export const invalidateTurnstileConfigCache = () => {
  configPromise = null;
};

export const verifyTurnstileToken = async (token: string, action?: string) => {
  const normalizedToken = String(token || '').trim();

  if (!normalizedToken) {
    throw new Error('Please complete the Cloudflare verification.');
  }

  const { data, error } = await invokeSupabaseFunction('verify-turnstile', {
    body: {
      token: normalizedToken,
      action,
    },
  });

  if (error) {
    throw new Error(error.message || 'Cloudflare verification failed.');
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Cloudflare verification failed.');
  }

  return true;
};
