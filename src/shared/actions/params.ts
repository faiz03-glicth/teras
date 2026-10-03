import type { TabId } from '../config/tabs';
import { isISODate } from '../lib/date/isoDate';
import type { AddExerciseTarget, AuthIntent, ISODate, OnboardingStep } from './types';

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

/** A real calendar day (rejects 2026-02-30), or null. */
export function parseISODate(raw: RawParam): ISODate | null {
  const value = first(raw);
  return value !== undefined && isISODate(value) ? value : null;
}

/** Ids are UUIDs or seeded slugs: letters, digits, '-' and '_' only. Anything else is not a record. */
const RECORD_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** A record id from a link (a workout's), or null if it cannot be one. */
export function parseRecordId(raw: RawParam): string | null {
  const value = first(raw)?.trim();
  return value && RECORD_ID.test(value) ? value : null;
}

/** The routine id that opens a new routine instead of a saved one: "/routine/new". */
export const NEW_ROUTINE = 'new';

/** The library adds to the routine being edited only when that is asked for; otherwise to the workout. */
export function parseAddExerciseTarget(raw: RawParam): AddExerciseTarget {
  return first(raw) === 'routine' ? 'routine' : 'workout';
}

/** Tab navigator route names → tab ids ("index" is Home). */
export function tabForRouteName(name: string | undefined): TabId {
  return name === 'workout' || name === 'profile' ? name : 'home';
}
