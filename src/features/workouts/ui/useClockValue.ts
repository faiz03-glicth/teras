import { useCallback, useSyncExternalStore } from 'react';

/** How often the clock is read: often enough that a countdown never visibly skips a second. */
const TICK_MS = 250;

/** One clock for everything that shows the time: a single timer, running only while something does. */
const clock = {
  now: 0,
  timer: null as ReturnType<typeof setInterval> | null,
  listeners: new Set<() => void>(),
};

function subscribe(listener: () => void): () => void {
  clock.listeners.add(listener);
  if (clock.timer === null) {
    clock.now = Date.now();
    clock.timer = setInterval(() => {
      clock.now = Date.now();
      clock.listeners.forEach((notify) => notify());
    }, TICK_MS);
  }
  return () => {
    clock.listeners.delete(listener);
    if (clock.listeners.size > 0 || clock.timer === null) return;
    clearInterval(clock.timer);
    clock.timer = null;
  };
}

/** The last tick while the clock runs; before anything has started it, the time itself. */
const currentTime = () => (clock.timer === null ? Date.now() : clock.now);

/**
 * A value worked out from the clock (seconds elapsed, seconds of rest left), kept current while the
 * component is up. The clock is read four times a second, but the component redraws only when the value
 * changes, so a seconds count costs one redraw a second, in the one place that shows it. Pass a stable
 * `read` (useCallback); a new one (a rest moved by 15 s) shows at once, not at the next tick.
 */
export function useClockValue(read: (now: number) => number): number {
  const snapshot = useCallback(() => read(currentTime()), [read]);
  return useSyncExternalStore(subscribe, snapshot);
}
