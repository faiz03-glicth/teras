import type { AuthIntent } from '../domain/types';

/** The in-page steps, in order: moving to a later one is forward, to an earlier one is back. */
export const LOGIN_STEPS = ['providers', 'email', 'code'] as const;
export type LoginStep = (typeof LOGIN_STEPS)[number];

export interface LoginHeading {
  title: string;
  subtitle: string;
}

/** PURE: the heading for each in-page step (and, on the first step, each intent). */
export function loginHeading(step: LoginStep, intent: AuthIntent, email: string): LoginHeading {
  if (step === 'email') return { title: 'Continue with email', subtitle: "We'll send you a 6-digit code." };
  if (step === 'code') return { title: 'Check your inbox', subtitle: `Enter the code sent to ${email}` };
  return intent === 'new'
    ? {
        title: 'Keep your wave safe',
        subtitle: 'Use the same account as Streak and your training days appear there as a second wave.',
      }
    : { title: 'Welcome back', subtitle: 'Sign in with the account you use for Streak.' };
}

export const RESEND_COOLDOWN_SECONDS = 60;
