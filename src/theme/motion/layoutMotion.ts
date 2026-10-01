import { FadeIn, FadeOut, Keyframe, LinearTransition } from 'react-native-reanimated';

import { motion } from '../tokens/motion';

export type Direction = 'forward' | 'back';

const { duration, ease, page, fadeUp, settle } = motion;

/**
 * pushForward / pushBack: the arriving page travels in from the side it comes from (the right when going
 * forward, the left when going back) and settles on the standard curve. It stays invisible for the first
 * `revealAt` percent, while the leaving page fades out, so the two never overlap.
 *
 * Each preset is its own Keyframe instance: Keyframe builders mutate themselves (`.delay()`, parsing),
 * so a shared instance must never be re-configured by a caller.
 */
function pageEnter(direction: Direction) {
  const from = direction === 'forward' ? page.distance : -page.distance;
  return new Keyframe({
    0: { opacity: 0, transform: [{ translateX: from }] },
    [page.revealAt]: { opacity: 0 },
    100: { opacity: 1, transform: [{ translateX: 0 }], easing: ease.standard },
  }).duration(page.enterMs);
}

/**
 * Layout animations (Reanimated `entering` / `exiting`): how content arrives and leaves. They follow the
 * app's Reduce Motion by themselves (MotionRuntimeBridge sets Reanimated's global mode), so callers never
 * check it. Identical in light and dark: the theme only changes colours.
 *
 * A leaving view keeps the props of its last render, which were decided before anyone knew where the
 * next page would come from; so leaving is always direction-free (a quick fade), and the arriving page
 * carries the direction.
 */
export const layoutMotion = {
  /** pushForward / pushBack (see pageEnter), and how the old page leaves. */
  push: {
    forward: pageEnter('forward'),
    back: pageEnter('back'),
    out: FadeOut.duration(page.exitMs).easing(ease.exit),
  },
  /** fade: one control's content replaced in place (a label → "Connecting…"): a quick cross-fade. */
  fade: {
    in: FadeIn.duration(duration.fast).easing(ease.enter),
    out: FadeOut.duration(duration.fast).easing(ease.exit),
  },
  /** settle: a view gliding to its new place when the layout around it changes (`layout` prop). */
  settle: LinearTransition.duration(settle.durationMs).easing(ease.standard),
  /** fadeUp: something appearing in place (a banner, a status line). */
  fadeUp: new Keyframe({
    0: { opacity: 0, transform: [{ translateY: fadeUp.distance }] },
    100: { opacity: 1, transform: [{ translateY: 0 }], easing: ease.enter },
  }).duration(fadeUp.durationMs),
};
