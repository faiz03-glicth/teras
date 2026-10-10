// The icons are glyphs of lucide's own icon font (lucide-static, the same release as lucide-react-native):
// one line of text each, drawn from the GPU's glyph cache. As SVGs they were four or five native views
// apiece, each painted in software into a bitmap of its own on the UI thread and then uploaded to the GPU,
// which made every screen with a list of icons slow to open. Only the filled heart (a favourite) is still
// an SVG: a glyph is an outline and can't be filled.
// One file per icon: Metro doesn't tree-shake, so importing from the package root bundles all ~1,900 icons.
import Heart from 'lucide-react-native/icons/heart';

/**
 * The icons the app uses, by name: the lucide icon each one is, and that icon's code point in lucide's
 * font (lucide-static/font/codepoints.json; a test keeps the two in step).
 */
export const ICONS = {
  alert: { lucide: 'circle-alert', code: 57463 },
  bell: { lucide: 'bell', code: 57433 },
  book: { lucide: 'book', code: 57438 },
  calendar: { lucide: 'calendar', code: 57443 },
  chart: { lucide: 'chart-column', code: 58019 },
  check: { lucide: 'check', code: 57452 },
  'chevron-down': { lucide: 'chevron-down', code: 57453 },
  'chevron-left': { lucide: 'chevron-left', code: 57454 },
  'chevron-right': { lucide: 'chevron-right', code: 57455 },
  'chevron-up': { lucide: 'chevron-up', code: 57456 },
  clock: { lucide: 'clock', code: 57479 },
  close: { lucide: 'x', code: 57778 },
  code: { lucide: 'code', code: 57491 },
  contrast: { lucide: 'contrast', code: 57501 },
  download: { lucide: 'download', code: 57522 },
  droplet: { lucide: 'droplet', code: 57524 },
  dumbbell: { lucide: 'dumbbell', code: 58273 },
  flame: { lucide: 'flame', code: 57554 },
  flower: { lucide: 'flower-2', code: 58068 },
  footprints: { lucide: 'footprints', code: 58297 },
  heart: { lucide: 'heart', code: 57586 },
  help: { lucide: 'circle-question-mark', code: 57474 },
  house: { lucide: 'house', code: 57589 },
  info: { lucide: 'info', code: 57593 },
  list: { lucide: 'list-checks', code: 57808 },
  lock: { lucide: 'lock', code: 57611 },
  'log-out': { lucide: 'log-out', code: 57614 },
  mail: { lucide: 'mail', code: 57615 },
  minus: { lucide: 'minus', code: 57628 },
  moon: { lucide: 'moon', code: 57630 },
  palette: { lucide: 'palette', code: 57821 },
  pencil: { lucide: 'pencil', code: 57849 },
  plus: { lucide: 'plus', code: 57661 },
  search: { lucide: 'search', code: 57681 },
  shield: { lucide: 'shield', code: 57688 },
  sparkles: { lucide: 'sparkles', code: 58386 },
  star: { lucide: 'star', code: 57718 },
  target: { lucide: 'target', code: 57728 },
  trash: { lucide: 'trash', code: 57741 },
  'trending-down': { lucide: 'trending-down', code: 57744 },
  'trending-up': { lucide: 'trending-up', code: 57745 },
  trophy: { lucide: 'trophy', code: 58227 },
  upload: { lucide: 'upload', code: 57758 },
  user: { lucide: 'user', code: 57759 },
  volume: { lucide: 'volume-2', code: 57771 },
} as const satisfies Record<string, { lucide: string; code: number }>;

export type IconName = keyof typeof ICONS;

/** The icons that also come filled (`Icon`'s `fill`), drawn as SVG. */
export const FILLED_ICONS: Partial<Record<IconName, typeof Heart>> = { heart: Heart };

export function isIconName(name: string): name is IconName {
  return Object.hasOwn(ICONS, name);
}
