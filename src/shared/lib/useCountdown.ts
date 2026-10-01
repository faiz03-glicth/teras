import { useCallback, useEffect, useState } from 'react';

/** A whole-second countdown. `start(60)` counts 60 → 0; `active` is true until it reaches 0. */
export function useCountdown() {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  const start = useCallback((seconds: number) => setRemaining(seconds), []);

  return { remaining, active: remaining > 0, start };
}
