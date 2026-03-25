import { useEffect, useMemo, useState } from 'react';

interface LoadingRecoveryOptions {
  isLoading: boolean;
  timeoutMs?: number;
  recoveryKey: string;
  cooldownMs?: number;
}

interface LoadingRecoveryState {
  hasTimedOut: boolean;
  didTriggerReload: boolean;
}

const RECOVERY_STORAGE_PREFIX = 'loading-recovery';

export const useLoadingRecovery = ({
  isLoading,
  timeoutMs = 12000,
  recoveryKey,
  cooldownMs = 30000
}: LoadingRecoveryOptions): LoadingRecoveryState => {
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [didTriggerReload, setDidTriggerReload] = useState(false);

  const storageKey = useMemo(
    () => `${RECOVERY_STORAGE_PREFIX}:${recoveryKey}`,
    [recoveryKey]
  );

  useEffect(() => {
    if (!isLoading) {
      setHasTimedOut(false);
      setDidTriggerReload(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setHasTimedOut(true);

      try {
        const lastRecoveryAt = Number(sessionStorage.getItem(storageKey) || '0');
        const now = Date.now();

        if (!lastRecoveryAt || now - lastRecoveryAt > cooldownMs) {
          sessionStorage.setItem(storageKey, String(now));
          setDidTriggerReload(true);
          window.location.reload();
        }
      } catch (error) {
        console.warn('Loading recovery failed:', error);
      }
    }, timeoutMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [cooldownMs, isLoading, storageKey, timeoutMs]);

  return {
    hasTimedOut,
    didTriggerReload
  };
};

export const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> => {
  let timeoutHandle: number | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = window.setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      window.clearTimeout(timeoutHandle);
    }
  }
};
