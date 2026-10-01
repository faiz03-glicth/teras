import type { Href } from 'expo-router';

import type { AuthIntent, OnboardingStep, Tab } from './types';

/** The ONLY place route paths are written. Every action builds its destination here. */
export const routes = {
  home: (): Href => '/',
  tab: (tab: Tab): Href => (tab === 'home' ? '/' : `/${tab}`),
  onboarding: (step: OnboardingStep): Href => ({ pathname: '/onboarding', params: { step: String(step) } }),
  login: (intent: AuthIntent): Href => ({ pathname: '/login', params: { intent } }),
};
