import { screen } from '@testing-library/react-native';
import { View } from 'react-native';

import { TAB_ITEMS } from '@/shared/config/tabs';
import type { ISODate } from '@/shared/lib/date/isoDate';
import { RestBar } from '@/features/workouts/ui/components/RestBar';
import { ResumeBar } from '@/features/workouts/ui/components/ResumeBar';
import { UndoBar } from '@/features/workouts/ui/components/UndoBar';
import { renderInScheme, styleOf } from '@test/render';

import { Button } from '../Button';
import { Card } from '../Card';
import { ChipRow } from '../Chip';
import { IconButton } from '../IconButton';
import { LogoMark } from '../LogoMark';
import { SegmentedControl } from '../SegmentedControl';
import { StatTile } from '../StatTile';
import { TabBar } from '../TabBar';
import { TextField } from '../TextField';

jest.mock('@/shared/actions', () => require('@test/mocks/navigationActions'));

/**
 * Android draws every boxShadow, outset or inset and even with zero blur, as an extra pass per view; Black
 * draws its depth with native borders instead. Whatever a screen is made of, no view in Black carries one.
 */
function viewsWithBoxShadow() {
  return screen.UNSAFE_root.findAll(
    (node) => typeof node.type === 'string' && styleOf(node).boxShadow !== undefined,
  );
}

const noop = () => undefined;
const workout = {
  id: 'live',
  name: 'Leg Day',
  date: '2026-10-02' as ISODate,
  startedAt: new Date(Date.now() - 125_000).toISOString(),
  exerciseCount: 2,
  setsDone: 3,
  pastLog: false,
};

describe('Black draws no box-shadow', () => {
  it('on any of the shared controls and surfaces', () => {
    renderInScheme(
      <View>
        <Card>
          <Button label="Start" onPress={noop} />
          <Button label="Add set" variant="secondary" onPress={noop} />
          <Button label="Skip" variant="ghost" size="sm" onPress={noop} />
          <Button label="Delete" variant="danger" onPress={noop} />
        </Card>
        <Card tone="accentSoft">
          <StatTile label="Active days" value={12} />
        </Card>
        <IconButton icon="plus" onPress={noop} accessibilityLabel="Add" />
        <IconButton icon="pencil" plain onPress={noop} accessibilityLabel="Edit" />
        <ChipRow
          options={[
            { value: 'all', label: 'All' },
            { value: 'chest', label: 'Chest' },
          ]}
          value="all"
          onChange={noop}
          accessibilityLabel="Muscle"
        />
        <SegmentedControl
          options={[
            { value: 'kg', label: 'kg' },
            { value: 'lb', label: 'lb' },
          ]}
          value="kg"
          onChange={noop}
          accessibilityLabel="Unit"
        />
        <TextField label="Search" icon="search" />
        <LogoMark />
        <TabBar items={TAB_ITEMS} active="home" onTabPress={noop} />
      </View>,
      'dark',
    );

    expect(viewsWithBoxShadow()).toHaveLength(0);
  });

  it('on the bars docked over a workout: Resume, Rest and Undo', () => {
    renderInScheme(
      <View>
        <ResumeBar workout={workout} />
        <RestBar
          endsAt={new Date(Date.now() + 60_000).toISOString()}
          onLess={noop}
          onMore={noop}
          onSkip={noop}
          onOver={noop}
        />
        <UndoBar label="Set 2 deleted" onUndo={noop} />
      </View>,
      'dark',
    );

    expect(viewsWithBoxShadow()).toHaveLength(0);
  });

  it('while Parchment still does, so the check is real', () => {
    renderInScheme(
      <Card>
        <Button label="Start" onPress={noop} />
      </Card>,
      'light',
    );

    expect(viewsWithBoxShadow().length).toBeGreaterThan(0);
  });
});

describe('Black keeps its controls the size they were', () => {
  it('pads the mark so its nine cells keep their places inside the rim and base', () => {
    renderInScheme(<LogoMark size={76} />, 'dark');
    const mark = screen.UNSAFE_getAllByType(View).find((node) => styleOf(node).flexWrap === 'wrap');

    // 12 of padding, less the 1px rim at the top and sides and the 3px base below.
    expect(styleOf(mark)).toMatchObject({
      width: 76,
      height: 76,
      paddingTop: 11,
      paddingRight: 11,
      paddingBottom: 9,
      paddingLeft: 11,
      borderBottomWidth: 3,
    });
  });

  it.each([
    ['light', 0],
    ['dark', 1],
  ] as const)(
    'leaves a chip as wide as before in %s: the rim takes its width out of the padding',
    (scheme, rim) => {
      const { theme } = renderInScheme(
        <ChipRow
          options={[{ value: 'all', label: 'All' }]}
          value="all"
          onChange={noop}
          accessibilityLabel="Muscle"
        />,
        scheme,
      );

      expect(styleOf(screen.getByRole('radio', { name: 'All' })).paddingHorizontal).toBe(
        theme.spacing.md - rim,
      );
    },
  );
});
