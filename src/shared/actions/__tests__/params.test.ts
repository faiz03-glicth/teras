import {
  onboardingStepOf,
  parseAddExerciseTarget,
  parseAuthIntent,
  parseISODate,
  parseOnboardingStep,
  parseRecordId,
  tabForRouteName,
} from '../params';

describe('route param parsers', () => {
  it('reads the onboarding step, and falls back to Welcome for anything unexpected', () => {
    expect(parseOnboardingStep('1')).toBe(1);
    expect(parseOnboardingStep(['1', '0'])).toBe(1);
    for (const raw of [undefined, '0', '2', 'x', '']) expect(parseOnboardingStep(raw)).toBe(0);
  });

  it('reads the step from a route params object', () => {
    expect(onboardingStepOf({ step: '1' })).toBe(1);
    expect(onboardingStepOf({ step: 1 })).toBe(0);
    expect(onboardingStepOf(undefined)).toBe(0);
  });

  it('reads the sign-in intent, or uses the fallback', () => {
    expect(parseAuthIntent('existing', 'new')).toBe('existing');
    expect(parseAuthIntent('hack', 'new')).toBe('new');
    expect(parseAuthIntent(undefined, 'existing')).toBe('existing');
  });

  it('reads a real calendar day, and nothing else', () => {
    expect(parseISODate('2026-09-30')).toBe('2026-09-30');
    expect(parseISODate(['2026-09-30'])).toBe('2026-09-30');
    for (const raw of [undefined, '', '2026-02-30', '30-09-2026', '2026-9-3', 'today']) {
      expect(parseISODate(raw)).toBeNull();
    }
  });

  it('reads a record id, refusing anything that could not be one', () => {
    expect(parseRecordId('3f1c9a52-8b0e-4f7a-9d1e-0c2b7a6e5d41')).toBe(
      '3f1c9a52-8b0e-4f7a-9d1e-0c2b7a6e5d41',
    );
    expect(parseRecordId(['w1'])).toBe('w1');
    for (const raw of [undefined, '', '   ', '../etc', 'a b', 'x'.repeat(65)]) {
      expect(parseRecordId(raw)).toBeNull();
    }
  });

  it('adds to a routine only when asked to, and otherwise to the workout', () => {
    expect(parseAddExerciseTarget('routine')).toBe('routine');
    expect(parseAddExerciseTarget(['routine'])).toBe('routine');
    for (const raw of [undefined, '', 'workout', 'Routine', 'x']) {
      expect(parseAddExerciseTarget(raw)).toBe('workout');
    }
  });

  it('maps tab route names to tabs, with Home for anything else', () => {
    expect(tabForRouteName('index')).toBe('home');
    expect(tabForRouteName('workout')).toBe('workout');
    expect(tabForRouteName('profile')).toBe('profile');
    expect(tabForRouteName('settings')).toBe('home');
    expect(tabForRouteName(undefined)).toBe('home');
  });
});
