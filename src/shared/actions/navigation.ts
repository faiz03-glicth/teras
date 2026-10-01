import { router } from 'expo-router';

import { routes } from './routes';
import type { AuthIntent, OnboardingStep, Tab } from './types';

/** Auth-flow screens either push (forward) or replace (so Back never returns to the screen left behind). */
interface FlowOptions {
  replace?: boolean;
}

export function goHome(): void {
  router.dismissTo(routes.home());
}

export function goTab(tab: Tab): void {
  router.navigate(routes.tab(tab));
}

export function openOnboarding(step: OnboardingStep, { replace = false }: FlowOptions = {}): void {
  if (replace) router.replace(routes.onboarding(step));
  else router.push(routes.onboarding(step));
}

/** Moves between Welcome and Set up INSIDE the onboarding screen, so neither is left on the back stack. */
export function showOnboardingStep(step: OnboardingStep): void {
  router.setParams({ step: String(step) });
}

export function openLogin(intent: AuthIntent, { replace = false }: FlowOptions = {}): void {
  if (replace) router.replace(routes.login(intent));
  else router.push(routes.login(intent));
}

/** Pops the current screen; when there is nothing to pop, runs `fallback` (default: Home). */
export function goBack(fallback: () => void = goHome): void {
  if (router.canGoBack()) router.back();
  else fallback();
}
