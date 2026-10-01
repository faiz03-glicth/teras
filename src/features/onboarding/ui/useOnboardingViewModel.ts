import { useCallback, useEffect, useState } from 'react';
import { BackHandler } from 'react-native';

import { useAuthStore } from '@/features/auth/state/authStore';
import {
  formatHeight,
  formatRest,
  formatWeight,
  UNIT_SYSTEMS,
  type StepDirection,
  type WeightUnit,
} from '@/features/training/domain/preferences';
import { useTrainingPreferencesStore } from '@/features/training/state/trainingPreferencesStore';
import { openLogin, showOnboardingStep, type OnboardingStep } from '@/shared/actions';
import { useSessionActions } from '@/shared/actions/session';
import { haptics } from '@/shared/lib/haptics';
import { showInfo } from '@/shared/ui/toast';

import { HERO_GRID } from '../config/heroPattern';

export const UNIT_OPTIONS = [
  { value: 'kg', ...UNIT_SYSTEMS.kg },
  { value: 'lb', ...UNIT_SYSTEMS.lb },
] as const satisfies readonly { value: WeightUnit; label: string; detail: string }[];

/** Welcome and Set up are pages of one pager. */
const PAGE_COUNT = 2;
/** The dots count Sign in too: Welcome, Set up, Sign in. */
const DOT_COUNT = 3;

/** A pager page as a step (the pager only ever reports 0 or 1). */
const asStep = (page: number): OnboardingStep => (page >= 1 ? 1 : 0);

/**
 * Get Started: Welcome → Set up → Sign in. Set up's choices go straight into the persisted training
 * preferences, so they survive leaving the screen, signing in, and closing the app.
 */
export function useOnboardingViewModel(step: OnboardingStep) {
  const unit = useTrainingPreferencesStore((s) => s.unit);
  const bodyweightKg = useTrainingPreferencesStore((s) => s.bodyweightKg);
  const restSeconds = useTrainingPreferencesStore((s) => s.restSeconds);
  const setUnit = useTrainingPreferencesStore((s) => s.setUnit);
  const heightCm = useTrainingPreferencesStore((s) => s.heightCm);
  const stepBodyweight = useTrainingPreferencesStore((s) => s.stepBodyweight);
  const stepHeight = useTrainingPreferencesStore((s) => s.stepHeight);
  const stepRest = useTrainingPreferencesStore((s) => s.stepRest);
  const inSession = useAuthStore((s) => s.status === 'signedIn' || s.status === 'guest');
  const { finishOnboarding } = useSessionActions();
  const [finishing, setFinishing] = useState(false);

  // Android's Back button on Set up goes back to Welcome, like the on-screen Back (on Welcome it leaves).
  useEffect(() => {
    if (step === 0) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      showOnboardingStep(0);
      return true;
    });
    return () => subscription.remove();
  }, [step]);

  /** For someone already in a session (the app closed mid-setup, or Get Started is being replayed). */
  const finish = async () => {
    if (finishing) return;
    setFinishing(true);
    try {
      await finishOnboarding();
      haptics.success();
    } catch (cause) {
      console.error(`[onboarding] Could not finish (${cause instanceof Error ? cause.name : 'unknown'})`); // TODO(Sentry)
      showInfo({ title: "Couldn't finish setup", sub: 'Please try again.' });
    } finally {
      setFinishing(false);
    }
  };

  // Handed to the pages, so kept the same between renders: a page only re-renders when its own data changes.
  const onPageChange = useCallback((page: number) => showOnboardingStep(asStep(page)), []);
  const onUnitChange = useCallback(
    (next: WeightUnit) => {
      haptics.selection();
      setUnit(next);
    },
    [setUnit],
  );
  const onBodyweightStep = useCallback(
    (direction: StepDirection) => {
      haptics.selection();
      stepBodyweight(direction);
    },
    [stepBodyweight],
  );
  const onHeightStep = useCallback(
    (direction: StepDirection) => {
      haptics.selection();
      stepHeight(direction);
    },
    [stepHeight],
  );
  const onRestStep = useCallback(
    (direction: StepDirection) => {
      haptics.selection();
      stepRest(direction);
    },
    [stepRest],
  );

  const onPrimary =
    step === 0 ? () => showOnboardingStep(1) : inSession ? () => void finish() : () => openLogin('new');

  return {
    step,
    pageCount: PAGE_COUNT,
    dotCount: DOT_COUNT,
    hero: HERO_GRID,
    primaryLabel: step === 0 ? 'Get started' : 'Continue',
    showBack: step === 1,
    // Someone already in a session has no account to switch to from here.
    showHaveAccount: step === 0 && !inSession,
    finishing,

    unit,
    unitOptions: UNIT_OPTIONS,
    bodyweightLabel: formatWeight(bodyweightKg, unit),
    heightLabel: formatHeight(heightCm, unit),
    restLabel: formatRest(restSeconds),

    onPrimary,
    onHaveAccount: () => openLogin('existing'),
    onBack: () => showOnboardingStep(0),
    /** A swipe landed on another page. */
    onPageChange,
    onUnitChange,
    onBodyweightStep,
    onHeightStep,
    onRestStep,
  };
}

export type OnboardingViewModel = ReturnType<typeof useOnboardingViewModel>;
