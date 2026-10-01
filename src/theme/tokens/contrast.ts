/** WCAG 2.x relative luminance of a #RRGGBB colour. */
export function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r = 0, g = 0, b = 0] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio between two #RRGGBB colours (1–21). */
export function contrastRatio(a: string, b: string): number {
  const [hi = 0, lo = 0] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const HEX = /^#[0-9a-f]{6}$/i;

/**
 * PURE: the most legible of `candidates` on `background` (text printed on a heat colour, whatever the
 * palette). A background that isn't a plain #RRGGBB (a translucent glass tint) keeps the first candidate.
 */
export function mostLegible(background: string, candidates: readonly [string, ...string[]]): string {
  if (!HEX.test(background)) return candidates[0];
  return candidates.reduce((best, candidate) =>
    contrastRatio(candidate, background) > contrastRatio(best, background) ? candidate : best,
  );
}
