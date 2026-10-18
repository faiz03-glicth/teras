import { fireEvent, screen } from '@testing-library/react-native';

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

describe('a tap on a month', () => {
  // 10 pt cells and 3 pt gaps: one day every 13 pt, inside the 4 pt the cached view keeps around its cells.
  const STEP = 13;
  const BLEED = 4;
  const at = (column: number, row: number, nudge = 5) => ({
    nativeEvent: { locationX: BLEED + column * STEP + nudge, locationY: BLEED + row * STEP + nudge },
  });
  const grid = buildLevelGrid(5, 7, () => 1);
  // Every day has happened (it has a label) but the first column's.
  const month = {
    key: '2026-09',
    label: 'Sep',
    grid: {
      columns: grid.columns.map((column, index) =>
        column.map((day) => (index === 0 ? day : { ...day, label: `Day ${day.key}` })),
      ),
    },
  };
  const render = (onDayPress: (day: string) => void) =>
    renderInScheme(
      <HeatmapMonths months={[month]} dayLabels={DAY_LABELS} onDayPress={onDayPress} maxCell={10} />,
      'light',
    );

  it('opens the day under the finger', () => {
    const onDayPress = jest.fn();
    render(onDayPress);

    fireEvent.press(screen.getByTestId('month-cells-2026-09'), at(2, 4));

    expect(onDayPress).toHaveBeenCalledWith('2-4');
  });

  it('gives a tap between two days to the day before the gap', () => {
    const onDayPress = jest.fn();
    render(onDayPress);

    fireEvent.press(screen.getByTestId('month-cells-2026-09'), at(1, 6, 11));

    expect(onDayPress).toHaveBeenCalledWith('1-6');
  });

  it('leaves a day that has nothing to open alone', () => {
    const onDayPress = jest.fn();
    render(onDayPress);

    fireEvent.press(screen.getByTestId('month-cells-2026-09'), at(0, 3));

    expect(onDayPress).not.toHaveBeenCalled();
  });

  it('lets a screen reader open each day on its own', () => {
    const onDayPress = jest.fn();
    render(onDayPress);

    fireEvent(screen.getByRole('button', { name: 'Day 3-1' }), 'accessibilityAction', {
      nativeEvent: { actionName: 'activate' },
    });

    expect(onDayPress).toHaveBeenCalledWith('3-1');
  });
});
