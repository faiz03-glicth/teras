import { buildTheme } from '../buildTheme';
import { softMaterials } from '../materials/soft';
import { semanticColors } from '../tokens/colors';
import { contrastRatio } from '../tokens/contrast';

/** The muscle map sits on a raised card: the body must read as a body, and each muscle as a part of it. */
describe('the muscle map colours', () => {
  it('in Walnut, make every muscle stand out from the card and from the body around it', () => {
    const colors = semanticColors.dark;
    const card = colors.bodyCanvas;

    expect(contrastRatio(card, softMaterials.dark.raised.background)).toBeGreaterThan(1.1);
    expect(contrastRatio(colors.bodyMuscle, card)).toBeGreaterThanOrEqual(4);
    expect(contrastRatio(colors.bodyMuscle, colors.bodySilhouette)).toBeGreaterThanOrEqual(2.5);
    expect(contrastRatio(colors.bodySilhouette, card)).toBeGreaterThanOrEqual(1.4);
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
