import { act, fireEvent, screen } from '@testing-library/react-native';

import { useExerciseBrowserStore } from '@/features/exercises/state/exerciseBrowserStore';
import * as actions from '@/shared/actions';
import { renderInScheme } from '@test/render';

import { EquipmentFilterSheet } from '../EquipmentFilterSheet';

jest.mock('@/shared/actions', () => require('@test/mocks/navigationActions'));

const browser = () => useExerciseBrowserStore.getState();

beforeEach(() => {
  jest.clearAllMocks();
  act(() => browser().clear());
});

// The muscle filter opens in the browser itself: see ExerciseLibraryScreen.test.tsx.
describe('the equipment filter', () => {
  it('lists every kind of equipment and marks the one chosen', () => {
    act(() => browser().setEquipment('dumbbell'));
    renderInScheme(<EquipmentFilterSheet />);

    expect(screen.getByRole('header', { name: 'Equipment' })).toBeTruthy();
    expect(screen.getAllByRole('radio')).toHaveLength(8);
    expect(screen.getByRole('radio', { name: 'Dumbbell' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'All equipment' })).not.toBeChecked();
  });

  it('filters by the one tapped, then closes', () => {
    renderInScheme(<EquipmentFilterSheet />);

    fireEvent.press(screen.getByRole('radio', { name: 'Kettlebell' }));

    expect(browser().equipment).toBe('kettlebell');
    expect(actions.goBack).toHaveBeenCalled();
  });

  it('takes the filter off with All equipment', () => {
    act(() => browser().setEquipment('band'));
    renderInScheme(<EquipmentFilterSheet />);

    fireEvent.press(screen.getByRole('radio', { name: 'All equipment' }));

    expect(browser().equipment).toBeNull();
  });
});
