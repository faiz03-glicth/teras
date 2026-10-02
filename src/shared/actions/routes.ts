import type { Href } from 'expo-router';

import type { AuthIntent, ISODate, OnboardingStep, Tab } from './types';

/** The ONLY place route paths are written. Every action builds its destination here. */
export const routes = {
  home: (): Href => '/',
  tab: (tab: Tab): Href => (tab === 'home' ? '/' : `/${tab}`),
  calendar: (): Href => '/calendar',
  day: (date: ISODate): Href => ({ pathname: '/day/[date]', params: { date } }),
  session: (id: string): Href => ({ pathname: '/session/[id]', params: { id } }),
  onboarding: (step: OnboardingStep): Href => ({ pathname: '/onboarding', params: { step: String(step) } }),
  login: (intent: AuthIntent): Href => ({ pathname: '/login', params: { intent } }),
  activeWorkout: (): Href => '/workout/active',
  addExercise: (): Href => '/workout/add-exercise',
  exerciseLibrary: (): Href => '/exercises',
  exercise: (id: string): Href => ({ pathname: '/exercise/[id]', params: { id } }),
  workoutSaved: (id: string): Href => ({ pathname: '/workout/saved/[id]', params: { id } }),
};
