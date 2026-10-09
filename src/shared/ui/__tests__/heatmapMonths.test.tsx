import { screen } from '@testing-library/react-native';

import { buildLevelGrid } from '@/features/heatmap/domain/grid';
import { renderInScheme } from '@test/render';

import { HeatmapMonths } from '../HeatmapMonths';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * On Android an empty day's dent is two blurred inset shadows, rasterised again in software for every cell
 * on every frame the wave moves (a tab fading, a scroll, a screen sliding back over Home). Each month's cells
 * are drawn once into a texture instead; without collapsable={false} Fabric flattens that view (and the
 * cache with it) away.
 */
it("draws each month's cells once, into a texture reused while the wave moves", () => {
  renderInScheme(
    <HeatmapMonths
      months={[
        { key: '2026-08', label: 'Aug', grid: buildLevelGrid(5, 7, () => 0) },
        { key: '2026-09', label: 'Sep', grid: buildLevelGrid(5, 7, () => 2) },
      ]}
      dayLabels={DAY_LABELS}
    />,
    'light',
  );

  for (const key of ['2026-08', '2026-09']) {
    const cells = screen.getByTestId(`month-cells-${key}`);
    expect(cells.props.renderToHardwareTextureAndroid).toBe(true);
    expect(cells.props.collapsable).toBe(false);
  }
});
