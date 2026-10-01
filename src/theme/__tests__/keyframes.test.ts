import type { CSSKeyframesRule } from 'react-native-reanimated';

import { checkInPulse, heatmapFall, heatmapReveal, heatmapStack, staggerIn } from '../motion/cssMotion';

/*
 * Jest never hands keyframes to Reanimated's native side, so invalid ones only crash on a phone
 * ("Invalid keyframe selector"). This runs every keyframe the motion system defines through the same
 * selector check Reanimated uses natively.
 */
const { normalizeKeyframeSelector } =
  require('react-native-reanimated/src/css/native/normalization/animation/keyframes') as {
    normalizeKeyframeSelector: (selector: string | number) => number[];
  };

const rules: [string, CSSKeyframesRule][] = [
  ['heatmap reveal', heatmapReveal(0, 0).animationName],
  // Every row's fall (each has its own release time) in each of the four tumbles.
  ...[0, 1, 2, 3, 4, 5, 6].flatMap((row) =>
    [0, 1, 2, 3].map((column): [string, CSSKeyframesRule] => [
      `heatmap fall (row ${row}, column ${column})`,
      heatmapFall(column, row, 7).animationName,
    ]),
  ),
  // Stacking on the Welcome heatmap (20 diagonals) and the login mark (5).
  ...[0, 10, 19].map((diagonal): [string, CSSKeyframesRule] => [
    `heatmap stack (diagonal ${diagonal} of 20)`,
    heatmapStack(diagonal, 0, 20).animationName,
  ]),
  ...[0, 4].map((diagonal): [string, CSSKeyframesRule] => [
    `logo stack (diagonal ${diagonal} of 5)`,
    heatmapStack(diagonal, 0, 5).animationName,
  ]),
  ['stagger-in', staggerIn(0).animationName],
  ['check-in pulse', checkInPulse.animationName],
];

describe.each(rules)('%s keyframes', (_name, rule) => {
  it('use selectors Reanimated accepts (fractions 0–1 or percentages 0%–100%)', () => {
    const selectors = Object.keys(rule.cssRules);
    expect(selectors.length).toBeGreaterThanOrEqual(2);
    for (const selector of selectors) {
      expect(() => normalizeKeyframeSelector(selector)).not.toThrow();
    }
  });

  it('start and end at their resting state (0% and 100% are both defined)', () => {
    const offsets = Object.keys(rule.cssRules).flatMap((selector) => normalizeKeyframeSelector(selector));
    expect(offsets).toContain(0);
    expect(offsets).toContain(1);
  });
});

it('the check itself rejects the selector that crashed on device ("45"), and accepts "45%"', () => {
  expect(() => normalizeKeyframeSelector('45')).toThrow(/Invalid keyframe selector/);
  expect(normalizeKeyframeSelector('45%')).toEqual([0.45]);
});
