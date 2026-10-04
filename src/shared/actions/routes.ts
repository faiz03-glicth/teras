import type { Href } from 'expo-router';

import type { AddExerciseTarget, AuthIntent, ISODate, OnboardingStep, Tab } from './types';

/** The ONLY place route paths are written. Every action builds its destination here. */
export const routes = {
  home: (): Href => '/',
  tab: (tab: Tab): Href => (tab === 'home' ? '/' : `/${tab}`),
  calendar: (): Href => '/calendar',
  records: (): Href => '/records',
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
  exerciseLibrary: (): Href => '/exercises',
  exercise: (id: string): Href => ({ pathname: '/exercise/[id]', params: { id } }),
  equipmentFilter: (): Href => '/equipment-filter',
  createExercise: (): Href => '/create-exercise',
  workoutSaved: (id: string): Href => ({ pathname: '/workout/saved/[id]', params: { id } }),
};
