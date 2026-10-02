import { act, fireEvent, screen } from '@testing-library/react-native';

import { useExerciseBrowserStore } from '@/features/exercises/state/exerciseBrowserStore';
import * as actions from '@/shared/actions';
import { renderInScheme } from '@test/render';

import { EquipmentFilterSheet } from '../EquipmentFilterSheet';
import { MuscleFilterSheet } from '../MuscleFilterSheet';

jest.mock('@/shared/actions', () => require('@test/mocks/navigationActions'));

const browser = () => useExerciseBrowserStore.getState();

beforeEach(() => {
  jest.clearAllMocks();
  act(() => browser().clear());
});

describe('the muscle filter', () => {
  it('filters by the muscle picked from the list, then closes', () => {
    renderInScheme(<MuscleFilterSheet />);

    expect(screen.getByRole('header', { name: 'Muscle' })).toBeTruthy();
    expect(screen.getByText('Tap a muscle on the body, or pick from the list.')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'All muscles' })).toBeChecked();
    fireEvent.press(screen.getByRole('radio', { name: 'Chest' }));

    expect(browser().muscle).toBe('chest');
    expect(actions.goBack).toHaveBeenCalled();
  });

  it('filters by a muscle tapped on the body', () => {
    renderInScheme(<MuscleFilterSheet />);

    // The drawing is hidden from screen readers, which pick from the list instead.
    fireEvent.press(screen.getByTestId('region-reardelts', { includeHiddenElements: true }));

    expect(browser().muscle).toBe('shoulders');
    expect(actions.goBack).toHaveBeenCalled();
  });

  it('marks the muscle chosen, and All muscles takes it off', () => {
    act(() => browser().setMuscle('chest'));
    renderInScheme(<MuscleFilterSheet />);

    expect(screen.getByRole('radio', { name: 'Chest' })).toBeChecked();
    fireEvent.press(screen.getByRole('radio', { name: 'All muscles' }));

    expect(browser().muscle).toBeNull();
  });

  it('closes without changing anything', () => {
    act(() => browser().setMuscle('chest'));
    renderInScheme(<MuscleFilterSheet />);

    fireEvent.press(screen.getByRole('button', { name: 'Close' }));

    expect(actions.goBack).toHaveBeenCalled();
    expect(browser().muscle).toBe('chest');
  });
});

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
