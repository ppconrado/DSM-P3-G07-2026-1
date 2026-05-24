'use client';

import { useEffect } from 'react';

export function useAutoHideMessage(
  message: string | null,
  clearMessage: () => void,
  delay = 3000,
) {
  useEffect(() => {
    if (!message) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      clearMessage();
    }, delay);

    return () => window.clearTimeout(timeoutId);
  }, [clearMessage, delay, message]);
}
