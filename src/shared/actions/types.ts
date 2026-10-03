export type { AuthIntent } from '@/features/auth/domain/types';
export type { TabId as Tab } from '../config/tabs';
export type { ISODate } from '../lib/date/isoDate';

/** Get Started: 0 = Welcome, 1 = Set up. Sign in is its own route. */
export type OnboardingStep = 0 | 1;

/** Where an exercise picked in the library goes: the workout in progress, or the routine being edited. */
export type AddExerciseTarget = 'workout' | 'routine';

export const LEGAL_DOCS = ['terms', 'privacy', 'acknowledgements'] as const;
export type LegalDoc = (typeof LEGAL_DOCS)[number];
