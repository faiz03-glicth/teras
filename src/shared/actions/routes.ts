import type { Href } from 'expo-router';

import type { AddExerciseTarget, AuthIntent, ISODate, OnboardingStep, Tab } from './types';

/** The ONLY place route paths are written. Every action builds its destination here. */
export const routes = {
  home: (): Href => '/',
  tab: (tab: Tab): Href => (tab === 'home' ? '/' : `/${tab}`),
  calendar: (): Href => '/calendar',
  /** A year's twelve months. */
  calendarYear: (year: number): Href => ({ pathname: '/calendar/[year]', params: { year: String(year) } }),
  /** A month's days; `month` is zero-based like Date, the link carries 1–12. */
  calendarMonth: (year: number, month: number): Href => ({
    pathname: '/calendar/[year]/[month]',
    params: { year: String(year), month: String(month + 1) },
  }),
  records: (): Href => '/records',
  logWeight: (): Href => '/log-weight',
  ffmi: (): Href => '/ffmi',
  day: (date: ISODate): Href => ({ pathname: '/day/[date]', params: { date } }),
  session: (id: string): Href => ({ pathname: '/session/[id]', params: { id } }),
  onboarding: (step: OnboardingStep): Href => ({ pathname: '/onboarding', params: { step: String(step) } }),
  login: (intent: AuthIntent): Href => ({ pathname: '/login', params: { intent } }),
  activeWorkout: (): Href => '/workout/active',
  addExercise: (target: AddExerciseTarget = 'workout'): Href =>
    target === 'workout'
      ? '/workout/add-exercise'
      : { pathname: '/workout/add-exercise', params: { target } },
  routine: (id: string): Href => ({ pathname: '/routine/[id]', params: { id } }),
  routinePreview: (id: string): Href => ({ pathname: '/routine-preview/[id]', params: { id } }),
  exerciseLibrary: (): Href => '/exercises',
  exercise: (id: string): Href => ({ pathname: '/exercise/[id]', params: { id } }),
  equipmentFilter: (): Href => '/equipment-filter',
  createExercise: (): Href => '/create-exercise',
  workoutSaved: (id: string): Href => ({ pathname: '/workout/saved/[id]', params: { id } }),
  share: (workoutId: string): Href => ({ pathname: '/share/[workoutId]', params: { workoutId } }),
};
