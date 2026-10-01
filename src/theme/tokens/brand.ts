/**
 * The brand gold (sampled from the Kingdom Rush kit's stat pips). Defined once and used as `colors.accent`
 * in BOTH schemes, so switching theme changes the surroundings, never the brand. Accessibility is solved
 * around it, not by changing it:
 * - text and icons ON the gold use a dark wood ink (`onAccent`, 11.7:1);
 * - the gold is too light to read against parchment, so a gold FILL always carries `accentEdge`, a dark
 *   outline, and gold-coloured TEXT, icons and indicators (focus rings, switches, dots) use `accentText`.
 */
export const BRAND_GOLD = '#FFD179';

/** Dark wood ink for text and icons on the brand gold (11.7:1). */
export const ON_BRAND = '#2B1D0B';
