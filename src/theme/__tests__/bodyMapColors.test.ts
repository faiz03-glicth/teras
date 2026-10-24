import { buildTheme } from '../buildTheme';
import { softMaterials } from '../materials/soft';
import { semanticColors } from '../tokens/colors';
import { contrastRatio } from '../tokens/contrast';

/** The muscle map sits on a raised card: the body must read as a body, and each muscle as a part of it. */
describe('the muscle map colours', () => {
  it('in Black, make every muscle stand out from the card and from the body around it', () => {
    const colors = semanticColors.dark;
    const card = colors.bodyCanvas;

    // The card is the raised graphite itself: flat Black has no shadow to lift it any further.
    expect(card).toBe(softMaterials.dark.raised.background);
    expect(contrastRatio(colors.bodyMuscle, card)).toBeGreaterThanOrEqual(4);
    expect(contrastRatio(colors.bodyMuscle, colors.bodySilhouette)).toBeGreaterThanOrEqual(2.5);
    expect(contrastRatio(colors.bodySilhouette, card)).toBeGreaterThanOrEqual(1.2);
    expect(contrastRatio(colors.text, card)).toBeGreaterThanOrEqual(4.5);
  });

  it('in Parchment, stay as they were', () => {
    const colors = semanticColors.light;

    expect(colors.bodyCanvas).toBe(softMaterials.light.raised.background);
    expect(colors.bodySilhouette).toBe(colors.subtle);
    expect(colors.bodyMuscle).toBe(colors.border);
  });

  it.each(['light', 'dark'] as const)('in %s, never let a plain muscle pass for a selected one', (scheme) => {
    const theme = buildTheme(scheme, 'amber');

    expect(contrastRatio(theme.heat[4], theme.colors.bodyMuscle)).toBeGreaterThanOrEqual(2);
  });
});

describe.each(['light', 'dark'] as const)('the week map tiers in %s', (scheme) => {
  const colors = semanticColors[scheme];
  const card = colors.bodyCanvas;

  it('tell not hit, once and twice apart from one another', () => {
    expect(contrastRatio(colors.muscleOnce, colors.muscleNone)).toBeGreaterThanOrEqual(1.6);
    expect(contrastRatio(colors.muscleTwice, colors.muscleOnce)).toBeGreaterThanOrEqual(2);
  });

  it('keep a muscle that was not hit visible on the card, and the trained ones clearly so', () => {
    expect(contrastRatio(colors.muscleNone, card)).toBeGreaterThanOrEqual(1.4);
    expect(contrastRatio(colors.muscleOnce, card)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(colors.muscleTwice, card)).toBeGreaterThanOrEqual(3);
  });
});
