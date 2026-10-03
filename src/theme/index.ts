// Public API of the theme module. The persisted store is intentionally not re-exported:
// ViewModels import it from theme/state directly, and Views never touch it.
export type {
  ActivityColorKey,
  ColorScheme,
  HeatLevel,
  HeatPaletteId,
  ReduceMotionPreference,
  Theme,
  ThemePreference,
  TypographyVariant,
} from './types';
export { buildTheme } from './buildTheme';
export { HEAT_PALETTE_IDS, heatPalettes } from './tokens/heatPalettes';
export { BRAND_GOLD } from './tokens/brand';
export { resolveScheme, useResolvedScheme } from './hooks/useResolvedScheme';
export { resolveReduceMotion, useReduceMotion, useSystemReduceMotion } from './hooks/useReduceMotion';
// The motion system: one source of timing (tokens), presets by meaning, Reduce Motion resolved once.
// Components ask for a meaning (press, selection, heatmapReveal, push…); none writes its own animation.
export { cssEase, motion, type Curve } from './tokens/motion';
export { heatmapRevealDelay, type HeatmapRevealStyle } from './motion/cssMotion';
export { layoutMotion, type Direction } from './motion/layoutMotion';
export { useHoldMotion, type HoldMotionOptions } from './motion/useHoldMotion';
export {
  collapseMs,
  fallSpanMs,
  flipCatchMs,
  flipLandingMs,
  flipTurnMs,
  landingMs,
  rebuildMs,
  rebuildStartMs,
  restAtMs,
  rowReleaseMs,
  soundedDiagonals,
  stackSpanMs,
} from './motion/heatmapRebuild';
export { useMotion } from './motion/useMotion';
export { useNavigationMotion, type NavigationMotion } from './motion/useNavigationMotion';
export { usePressMotion, type PressFeedback } from './motion/usePressMotion';
export { useSelectionMotion } from './motion/useSelectionMotion';
export { useDayChangeMotion } from './motion/useDayChangeMotion';
export { useStateTransition } from './motion/useStateTransition';
export { centredSlot, slotDistance, useWheelFocus, wheelFocus } from './motion/useWheelFocus';
export { MotionRuntimeBridge } from './sync/MotionRuntimeBridge';
export { ThemeRuntimeBridge } from './sync/ThemeRuntimeBridge';
