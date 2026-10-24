import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { processColor } from 'react-native';

import type { MuscleSetRow } from '@/features/workouts/data/WorkoutRepository';
import { createFakeRepositories } from '@test/fakes/fakeRepositories';
import { MUSCLE_OF_GROUP, wholeBody, workout } from '@test/fakes/muscleRows';
import { renderWithApp } from '@test/providers';
import { SCHEMES } from '@test/render';

import { MuscleBalanceCard } from '../MuscleBalanceCard';
import { MuscleHistoryCard } from '../MuscleHistoryCard';
import { MusclesThisWeekCard } from '../MusclesThisWeekCard';

jest.mock('@/shared/lib/date/useToday', () => ({ useToday: () => '2026-10-22' }));

// The drawing is read as one phrase by the card, so its parts are queried as hidden elements too.
const hidden = { includeHiddenElements: true };

function render(
  ui: React.ReactElement,
  rows: MuscleSetRow[] | Error = [],
  scheme: 'light' | 'dark' = 'light',
) {
  const repositories = createFakeRepositories();
  if (rows instanceof Error) repositories.workouts.muscleSets.mockRejectedValue(rows);
  else repositories.workouts.muscleSets.mockResolvedValue(rows);
  return renderWithApp(ui, { repositories, scheme });
}

describe('the Muscles this week card', () => {
  it('names the card, counts the muscles hit twice, and labels the drawing in words', async () => {
    render(<MusclesThisWeekCard />, [
      ...workout('mon', '2026-10-19', ['chest', 'quads', 'calves']),
      ...workout('wed', '2026-10-21', ['chest', 'quads']),
    ]);

    expect(screen.getByText('Muscles this week')).toBeTruthy();
    expect(await screen.findByText('2 of 10 muscles hit twice')).toBeTruthy();
    const drawing = screen.getByRole('image');
    expect(drawing.props.accessibilityLabel).toContain('2 of 10 muscles hit twice');
    expect(drawing.props.accessibilityLabel).toContain('Calves hit once');
    expect(drawing.props.accessibilityLabel).toContain('Core not hit yet');
  });

  it('has a legend of three looks: not yet, once, twice', async () => {
    render(<MusclesThisWeekCard />);
    await screen.findByText('0 of 10 muscles hit twice');

    expect(screen.getByText('Not yet')).toBeTruthy();
    expect(screen.getByText('Once')).toBeTruthy();
    expect(screen.getByText('Twice')).toBeTruthy();
  });

  it.each(SCHEMES)(
    "draws the front and the back, each region in its group's tier colour in %s",
    async (scheme) => {
      const { theme } = render(
        <MusclesThisWeekCard />,
        [
          ...workout('mon', '2026-10-19', ['chest', 'quads', 'lats']),
          ...workout('wed', '2026-10-21', ['chest', 'lats']),
        ],
        scheme,
      );
      await screen.findByText('2 of 10 muscles hit twice');

      expect(screen.getByTestId('muscle-week-front', hidden)).toBeTruthy();
      expect(screen.getByTestId('muscle-week-back', hidden)).toBeTruthy();
      const fillOf = (region: string) => screen.getByTestId(`week-region-${region}`, hidden).props.fill;
      const color = (value: string) => ({ type: 0, payload: processColor(value) });
      expect(fillOf('pectorals')).toEqual(color(theme.colors.muscleTwice));
      expect(fillOf('quadriceps')).toEqual(color(theme.colors.muscleOnce));
      expect(fillOf('lowerback')).toEqual(color(theme.colors.muscleTwice));
      expect(fillOf('hamstrings')).toEqual(color(theme.colors.muscleNone));
    },
  );

  it('keeps its place and shows nothing hit while the week loads', async () => {
    render(<MusclesThisWeekCard />, wholeBody('a', '2026-10-19'));

    expect(screen.getByText('Loading…')).toBeTruthy();
    expect(screen.getByTestId('muscle-week-map')).toBeTruthy();
    expect(screen.queryByTestId('muscles-week-banner')).toBeNull();
    await screen.findByText('0 of 10 muscles hit twice');
  });

  it('says quietly that the week could not load, and does not crash', async () => {
    render(<MusclesThisWeekCard />, new Error('disk'));

    expect(await screen.findByText("Couldn't load this week")).toBeTruthy();
    expect(screen.getByTestId('muscle-week-map')).toBeTruthy();
  });

  it('shows the Keep this up banner only once all ten muscles are twice', async () => {
    const nine = [...wholeBody('a', '2026-10-19'), ...workout('b', '2026-10-20', MUSCLE_OF_GROUP.slice(1))];
    const first = render(<MusclesThisWeekCard />, nine);
    expect(await screen.findByText('9 of 10 muscles hit twice')).toBeTruthy();
    expect(screen.queryByText('Keep this up!')).toBeNull();
    first.unmount();

    render(<MusclesThisWeekCard />, [...wholeBody('a', '2026-10-19'), ...wholeBody('b', '2026-10-20')]);
    expect(await screen.findByText('10 of 10 muscles hit twice')).toBeTruthy();
    expect(screen.getByText('Every muscle, twice this week')).toBeTruthy();
    expect(screen.getByText('Keep this up!')).toBeTruthy();
  });

  it('lets the banner be closed', async () => {
    render(<MusclesThisWeekCard />, [...wholeBody('a', '2026-10-19'), ...wholeBody('b', '2026-10-20')]);
    await screen.findByText('Keep this up!');

    fireEvent.press(screen.getByRole('button', { name: 'Dismiss' }));

    await waitFor(() => expect(screen.queryByText('Keep this up!')).toBeNull());
    expect(screen.getByText('10 of 10 muscles hit twice')).toBeTruthy();
  });
});

describe('the Muscle history card', () => {
  it('names the card and the two weeks, lists the ten muscles, and states the goal', async () => {
    render(<MuscleHistoryCard />, [...wholeBody('l1', '2026-10-13'), ...wholeBody('l2', '2026-10-14')]);

    expect(screen.getByText('Muscle history')).toBeTruthy();
    expect(screen.getByText('Last week · this week')).toBeTruthy();
    for (const label of [
      'Chest',
      'Shoulders',
      'Biceps',
      'Triceps',
      'Core',
      'Quads',
      'Calves',
      'Hamstrings',
      'Glutes',
      'Back',
    ]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    expect(await screen.findByText(/All twice:.*1 of 2.*weeks/)).toBeTruthy();
  });

  it('marks each muscle behind this week with a bullet, and explains it in the legend', async () => {
    render(<MuscleHistoryCard />, [
      ...wholeBody('t1', '2026-10-19'),
      ...workout('t2', '2026-10-20', MUSCLE_OF_GROUP.slice(0, 7)),
    ]);

    // Hamstrings, Glutes and Back have one hit so far this week.
    await waitFor(() => expect(screen.getAllByText('•')).toHaveLength(3));
    expect(screen.getByText('• = behind this week')).toBeTruthy();
    expect(screen.getByText('Once')).toBeTruthy();
    expect(screen.getByText('Twice')).toBeTruthy();
  });

  it('marks nothing as behind while it loads, and every muscle when nothing was done', async () => {
    render(<MuscleHistoryCard />);

    expect(screen.queryByText('•')).toBeNull();
    await waitFor(() => expect(screen.getAllByText('•')).toHaveLength(10));
  });

  it('is one picture to a screen reader: the squares are not focusable on their own', async () => {
    render(<MuscleHistoryCard />, wholeBody('t1', '2026-10-20'));
    await screen.findByText(/All twice:.*0 of 2/);

    const grid = screen.getByTestId('muscle-history-grid');
    expect(grid.props.accessible).toBe(true);
    expect(grid.props.accessibilityLabel).toBe(
      'Muscle history, last 2 weeks. Every muscle twice in 0 of 2 weeks. Behind this week: Chest, Shoulders, Biceps, Triceps, Core, Quads, Calves, Hamstrings, Glutes, Back.',
    );
  });

  it('notes quietly that the history could not load', async () => {
    render(<MuscleHistoryCard />, new Error('disk'));

    expect(await screen.findByText("Couldn't load your muscle history")).toBeTruthy();
    expect(screen.getByText('Muscle history')).toBeTruthy();
  });
});

describe('the Muscle balance card', () => {
  const rows = [
    ...workout('n1', '2026-10-20', ['chest'], 10),
    ...workout('n2', '2026-09-25', ['chest', 'lats'], 4),
    ...workout('b1', '2026-09-24', ['chest'], 6),
  ];

  it('draws the web with a label for each of the ten muscles', async () => {
    render(<MuscleBalanceCard />, rows);
    await screen.findByTestId('radar-now', hidden);

    expect(screen.getByText('Muscle balance')).toBeTruthy();
    expect(screen.getByText('Sets per muscle')).toBeTruthy();
    // Chest is also the biggest gain, so its name is there twice.
    for (const label of [
      'Chest',
      'Shoulders',
      'Biceps',
      'Triceps',
      'Core',
      'Quads',
      'Calves',
      'Hamstrings',
      'Glutes',
      'Back',
    ]) {
      expect(screen.getAllByText(label).length).toBeGreaterThanOrEqual(1);
    }
  });

  it('shows the last 4 weeks and the 4 before, the biggest gain, and what needs work', async () => {
    render(<MuscleBalanceCard />, rows);

    expect(await screen.findByText('+8 sets')).toBeTruthy();
    expect(screen.getByText('Biggest gain')).toBeTruthy();
    expect(screen.getByText('Needs work')).toBeTruthy();
    expect(screen.getAllByText('Chest').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Last 4 weeks')).toBeTruthy();
    expect(screen.getByText('The 4 before')).toBeTruthy();
    expect(screen.getByTestId('radar-now', hidden)).toBeTruthy();
    expect(screen.getByTestId('radar-before', hidden)).toBeTruthy();
    expect(screen.getByRole('image').props.accessibilityLabel).toBe(
      'Muscle balance, sets per muscle in the last 4 weeks against the 4 before. Most trained: Chest. Least trained: Shoulders.',
    );
  });

  it('draws the web bare, without shapes, until there is something to draw', async () => {
    render(<MuscleBalanceCard />, rows);

    expect(screen.getByTestId('muscle-radar')).toBeTruthy();
    expect(screen.queryByTestId('radar-now', hidden)).toBeNull();
    await screen.findByTestId('radar-now', hidden);
  });

  it('asks for a first workout when there are no sets', async () => {
    render(<MuscleBalanceCard />, []);

    expect(await screen.findByText('Log a workout to see your balance')).toBeTruthy();
    expect(screen.queryByTestId('radar-now', hidden)).toBeNull();
    expect(screen.queryByText('Biggest gain')).toBeNull();
  });

  it('notes quietly that the balance could not load', async () => {
    render(<MuscleBalanceCard />, new Error('disk'));

    expect(await screen.findByText("Couldn't load your muscle balance")).toBeTruthy();
    expect(screen.getByTestId('muscle-radar')).toBeTruthy();
  });
});
