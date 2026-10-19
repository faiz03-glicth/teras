import { useEffect, useState } from 'react';

/**
 * How many of a screen's held-back parts to draw: none until `start`, then one more on each frame, up to
 * `parts`. Parts that would otherwise all be built in the one frame after a slide (a body, a chart, a list)
 * each get a frame of their own, so none of those frames is long.
 */
export function useStagedReveal(start: boolean, parts: number): number {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!start || shown >= parts) return;
    const frame = requestAnimationFrame(() => setShown((count) => count + 1));
    return () => cancelAnimationFrame(frame);
  }, [parts, shown, start]);

  return start ? Math.min(shown, parts) : 0;
}
