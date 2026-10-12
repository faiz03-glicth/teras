import { act, screen } from '@testing-library/react-native';

import { useAuthStore } from '@/features/auth/state/authStore';
import type { RoutineDraftItem } from '@/features/routines/domain/draft';
import { useRoutineDraftStore } from '@/features/routines/state/routineDraftStore';
import { LIBRARY } from '@test/fakes/exerciseRows';
import { createFakeRepositories, testUser } from '@test/fakes/fakeRepositories';
import { createWrapper } from '@test/providers';
import { renderInScheme } from '@test/render';

import { EditRoutineScreen } from '../EditRoutineScreen';

jest.mock('@/shared/actions', () => require('@test/mocks/navigationActions'));

/** What the counter reads of a row's props. */
type MockRowProps = { row: { key: string } };
type MockDraw = (mockProps: MockRowProps) => unknown;

/** The keys of the rows drawn, in order, since it was last emptied. */
const mockDrawn: string[] = [];

// The real row, memoised the same way, noting each time it is drawn.
jest.mock('../components/RoutineItemRow', () => {
  const actual = jest.requireActual('../components/RoutineItemRow');
  const { memo } = jest.requireActual('react');
  const draw = actual.RoutineItemRow.type as MockDraw;
  return {
    ...actual,
    RoutineItemRow: memo((props: MockRowProps) => {
      mockDrawn.push(props.row.key);
      return draw(props);
    }),
  };
});

const COUNT = 9;

/** A routine of nine exercises (the library's few, over again). */
const LONG = {
  routineId: 'long',
  name: 'Long Day',
  items: Array.from({ length: COUNT }, (_, index): RoutineDraftItem => ({
    key: `i${index + 1}`,
    exerciseId: LIBRARY[index % LIBRARY.length]!.id,
    targetSets: 3,
    targetReps: 10,
    targetSeconds: null,
    startWeightKg: null,
  })),
};

beforeEach(() => {
  act(() => {
    useAuthStore.setState({ status: 'signedIn', user: testUser() });
  });
});

async function editLong() {
  const repositories = createFakeRepositories();
  repositories.exercises.list.mockResolvedValue(LIBRARY);
  repositories.routines.get.mockResolvedValue(LONG);
  const { Wrapper } = createWrapper(repositories);
  renderInScheme(<EditRoutineScreen routineId="long" />, 'light', { wrapper: Wrapper });
  await screen.findByTestId(`routine-item-name-i${COUNT}`);
  mockDrawn.length = 0;
}

describe('a long routine being edited (S13)', () => {
  it('draws, on an add, only the new row and the one above it, whose Move down appears', async () => {
    await editLong();

    act(() => useRoutineDraftStore.getState().add('squat-barbell', 'weighted'));

    expect(screen.getAllByTestId(/^routine-item-name-/)).toHaveLength(COUNT + 1);
    expect(mockDrawn).toEqual([`i${COUNT}`, expect.stringMatching(/^added-/)]);
  });

  it('draws, on a change of targets, only the row changed', async () => {
    await editLong();

    act(() => useRoutineDraftStore.getState().update('i4', { targetSets: 5 }));

    expect(mockDrawn).toEqual(['i4']);
  });
});
