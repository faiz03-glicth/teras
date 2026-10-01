import type { TabId } from '../config/tabs';
import type { AuthIntent, OnboardingStep } from './types';

/** Route params arrive as string | string[] | undefined; take the first value. */
type RawParam = string | string[] | undefined;
const first = (raw: RawParam): string | undefined => (Array.isArray(raw) ? raw[0] : raw);

/** PURE parsers: each turns untrusted URL params (deep links included) into typed values or a safe fallback. */
export function parseOnboardingStep(raw: RawParam): OnboardingStep {
  return first(raw) === '1' ? 1 : 0;
}

/** The onboarding step from a route's params object (e.g. inside navigator screen options). */
export function onboardingStepOf(params: object | undefined): OnboardingStep {
  const step = params && 'step' in params ? params.step : undefined;
  return parseOnboardingStep(typeof step === 'string' ? step : undefined);
}

export function parseAuthIntent(raw: RawParam, fallback: AuthIntent): AuthIntent {
  const intent = first(raw);
  return intent === 'new' || intent === 'existing' ? intent : fallback;
}

/** Tab navigator route names → tab ids ("index" is Home). */
export function tabForRouteName(name: string | undefined): TabId {
  return name === 'workout' || name === 'profile' ? name : 'home';
}
