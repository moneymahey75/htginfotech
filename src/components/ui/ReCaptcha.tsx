import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle, Loader2, Shield } from 'lucide-react';
import { getTurnstileConfig, type TurnstileConfig } from '../../lib/turnstile';

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

interface ReCaptchaProps {
  onVerify: (token: string | null) => void;
  action?: string;
  resetSignal?: number;
}

const TURNSTILE_SCRIPT_ID = 'cloudflare-turnstile-script';

let turnstileScriptPromise: Promise<void> | null = null;

const loadTurnstileScript = () => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window is not available.'));
  }

  if (window.turnstile) {
    return Promise.resolve();
  }

  if (!turnstileScriptPromise) {
    turnstileScriptPromise = new Promise((resolve, reject) => {
      const existingScript = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null;

      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Cloudflare Turnstile.')), {
          once: true,
        });
        return;
      }

      const script = document.createElement('script');
      script.id = TURNSTILE_SCRIPT_ID;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Cloudflare Turnstile.'));
      document.head.appendChild(script);
    });
  }

  return turnstileScriptPromise;
};

const ReCaptcha: React.FC<ReCaptchaProps> = ({ onVerify, action = 'form_submit', resetSignal = 0 }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [config, setConfig] = useState<TurnstileConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState('');

  const resetWidget = useCallback(() => {
    setIsVerified(false);
    setError('');
    onVerify(null);

    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
  }, [onVerify]);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        setLoading(true);
        setError('');
        onVerify(null);
        const nextConfig = await getTurnstileConfig();
        if (!isMounted) {
          return;
        }
        setConfig(nextConfig);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : 'Failed to load Cloudflare Turnstile.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, [onVerify]);

  useEffect(() => {
    let isMounted = true;

    const renderWidget = async () => {
      if (!config?.enabled || !containerRef.current) {
        return;
      }

      try {
        await loadTurnstileScript();

        if (!isMounted || !window.turnstile || !containerRef.current) {
          return;
        }

        if (widgetIdRef.current) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: config.siteKey,
          action,
          callback: (token: string) => {
            setIsVerified(true);
            setError('');
            onVerify(token);
          },
          'expired-callback': () => {
            setIsVerified(false);
            onVerify(null);
          },
          'error-callback': () => {
            setIsVerified(false);
            setError('Cloudflare verification failed. Please try again.');
            onVerify(null);
          },
          theme: 'light',
          size: 'flexible',
        });
      } catch (renderError) {
        if (!isMounted) {
          return;
        }
        setError(renderError instanceof Error ? renderError.message : 'Failed to render Cloudflare Turnstile.');
      }
    };

    renderWidget();

    return () => {
      isMounted = false;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [action, config, onVerify]);

  useEffect(() => {
    if (!widgetIdRef.current || !window.turnstile) {
      return;
    }

    resetWidget();
  }, [resetSignal, resetWidget]);

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-sm overflow-hidden rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="mb-3 flex items-center justify-center space-x-2">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-gray-600" />
          ) : isVerified ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : error ? (
            <AlertCircle className="h-5 w-5 text-red-600" />
          ) : (
            <Shield className="h-5 w-5 text-gray-600" />
          )}
          <span className="whitespace-nowrap text-sm font-medium text-gray-700">Cloudflare Verification</span>
        </div>

        {loading ? (
          <p className="text-center text-xs text-gray-500">Loading security check...</p>
        ) : (
          <>
            <div className="mx-auto flex min-h-[65px] w-full justify-center overflow-hidden">
              <div ref={containerRef} className="min-h-[65px] w-full min-w-[300px]" />
            </div>
            {error ? (
              <div className="mt-3 text-center">
                <p className="text-xs text-red-600">{error}</p>
                <button
                  type="button"
                  onClick={resetWidget}
                  className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  Retry verification
                </button>
              </div>
            ) : null}
            {config?.usingTestKey ? (
              <p className="mt-3 text-center text-xs text-amber-600">
                Using Cloudflare Turnstile test keys for local development.
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};

export default ReCaptcha;
