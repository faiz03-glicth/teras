import { motion } from '../tokens/motion';

/**
 * Worklets (UI-thread code) capture motion tokens, and Reanimated can only copy plain data across threads:
 * primitives, plain objects, arrays and functions. A class instance anywhere inside `motion` (e.g. a CSS
 * easing object) crashes the first screen that animates.
 */
function nonPlainPaths(value: unknown, path: string): string[] {
  if (value === null || typeof value !== 'object') return [];
  const prototype = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) return [path];
  return Object.entries(value).flatMap(([key, child]) => nonPlainPaths(child, `${path}.${key}`));
}

it('motion tokens are plain data that worklets can safely capture', () => {
  expect(nonPlainPaths(motion, 'motion')).toEqual([]);
});

/**
 * A press must feel instant: the control is fully sunk within ~4 frames, and a held press on a scrolling
 * screen waits no longer than a scroll needs to claim the touch. Raising these makes every button feel late.
 */
it('keeps the press within its instant budget', () => {
  expect(motion.press.inMs).toBeLessThanOrEqual(70);
  expect(motion.scroll.pressDelayMs).toBeLessThanOrEqual(50);
  expect(motion.pager.pressDelayMs).toBeLessThanOrEqual(100);
});
