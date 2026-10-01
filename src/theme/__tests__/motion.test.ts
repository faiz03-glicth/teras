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
