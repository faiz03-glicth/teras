import { createContext, useContext, type ReactNode } from 'react';

const PressDelayContext = createContext(0);

/**
 * Presses inside wait `value` ms before they begin (press feedback, haptics). For swipeable areas: a touch
 * that turns into a swipe within the delay never becomes a press. Outside one, presses begin at once.
 */
export function PressDelay({ value, children }: { value: number; children: ReactNode }) {
  return <PressDelayContext value={value}>{children}</PressDelayContext>;
}

/** How long a press here waits before it begins, in ms (0: at once). */
export function usePressDelay(): number {
  return useContext(PressDelayContext);
}
