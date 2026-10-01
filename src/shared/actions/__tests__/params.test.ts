import { onboardingStepOf, parseAuthIntent, parseOnboardingStep, tabForRouteName } from '../params';

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

  it('maps tab route names to tabs, with Home for anything else', () => {
    expect(tabForRouteName('index')).toBe('home');
    expect(tabForRouteName('workout')).toBe('workout');
    expect(tabForRouteName('profile')).toBe('profile');
    expect(tabForRouteName('settings')).toBe('home');
    expect(tabForRouteName(undefined)).toBe('home');
  });
});
