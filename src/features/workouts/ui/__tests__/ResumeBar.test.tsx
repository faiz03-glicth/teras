import { fireEvent, screen } from '@testing-library/react-native';

import * as actions from '@/shared/actions';
import type { ISODate } from '@/shared/lib/date/isoDate';
import { renderInScheme } from '@test/render';

import type { ActiveWorkoutSummary } from '../../hooks/useWorkoutQueries';
import { ResumeBar } from '../components/ResumeBar';

jest.mock('@/shared/actions', () => require('@test/mocks/navigationActions'));

const running = (over: Partial<ActiveWorkoutSummary> = {}): ActiveWorkoutSummary => ({
  id: 'live',
  name: 'Leg Day',
  date: '2026-10-02' as ISODate,
  // Started 2 min 5 s ago.
  startedAt: new Date(Date.now() - 125_000).toISOString(),
  exerciseCount: 2,
  setsDone: 3,
  pastLog: false,
  ...over,
});

beforeEach(() => jest.clearAllMocks());

describe('the Resume bar', () => {
  it('names the workout, how long it has run and what is logged', () => {
    renderInScheme(<ResumeBar workout={running()} />, 'light');

    expect(screen.getByText('Leg Day')).toBeTruthy();
    expect(screen.getByText(/^2:0\d · 3 sets logged$/)).toBeTruthy();
    expect(screen.getByText('Resume')).toBeTruthy();
  });

  it('says one set in the singular', () => {
    renderInScheme(<ResumeBar workout={running({ setsDone: 1 })} />, 'dark');

    expect(screen.getByText(/· 1 set logged$/)).toBeTruthy();
  });

  it('opens the workout in progress, the whole bar being the target', () => {
    renderInScheme(<ResumeBar workout={running()} />, 'light');

    fireEvent.press(screen.getByRole('button', { name: 'Resume Leg Day' }));
    expect(actions.openActiveWorkout).toHaveBeenCalled();
  });
});
