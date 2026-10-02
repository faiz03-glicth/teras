import { useCallback } from 'react';
import Animated, { LayoutAnimationConfig, useSharedValue } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import type { OnboardingStep } from '@/shared/actions';
import { Button, NavBar, PageDots, Pager, Screen } from '@/shared/ui';
import { layoutMotion } from '@/theme';

import { SetupStep } from './components/SetupStep';
import { WelcomeStep } from './components/WelcomeStep';
import { useOnboardingViewModel } from './useOnboardingViewModel';

/**
 * Welcome and Set up are pages of one pager: swipe between them, or use the button and Back. The frame
 * stays put around them: the dots follow the finger, the button's label cross-fades, and the buttons glide
 * when "I already have an account" comes and goes. Sign in is the next route.
 *
 * The step changes when a swiped page lands, not while it moves; then only what depends on the step
 * re-renders (the frame). The pages are memoised: each re-renders for its own data only.
 */
export function OnboardingScreen({ step }: { step: OnboardingStep }) {
  const vm = useOnboardingViewModel(step);
  const { theme } = useUnistyles();
  // Where the pager is, in pages: the pager writes it on the UI thread, the dots read it.
  const progress = useSharedValue<number>(vm.step);
  const { hero, unit, unitOptions, bodyweightLabel, heightLabel, restLabel } = vm;
  const { bodyweightInput, heightInput, restInput } = vm;
  const { onUnitChange, onBodyweightStep, onHeightStep, onRestStep } = vm;
  const { onBodyweightType, onHeightType, onRestType } = vm;
  const renderPage = useCallback(
    (page: number) =>
      page === 0 ? (
        <WelcomeStep grid={hero} />
      ) : (
        <SetupStep
          unit={unit}
          unitOptions={unitOptions}
          bodyweightLabel={bodyweightLabel}
          heightLabel={heightLabel}
          restLabel={restLabel}
          bodyweightInput={bodyweightInput}
          heightInput={heightInput}
          restInput={restInput}
          onUnitChange={onUnitChange}
          onBodyweightStep={onBodyweightStep}
          onHeightStep={onHeightStep}
          onRestStep={onRestStep}
          onBodyweightType={onBodyweightType}
          onHeightType={onHeightType}
          onRestType={onRestType}
        />
      ),
    [
      hero,
      unit,
      unitOptions,
      bodyweightLabel,
      heightLabel,
      restLabel,
      bodyweightInput,
      heightInput,
      restInput,
      onUnitChange,
      onBodyweightStep,
      onHeightStep,
      onRestStep,
      onBodyweightType,
      onHeightType,
      onRestType,
    ],
  );

  return (
    <Screen scroll inset="wide" testID={`onboarding-step-${vm.step}`} contentStyle={styles.content}>
      <NavBar onBack={vm.showBack ? vm.onBack : undefined} />

      <Pager
        count={vm.pageCount}
        index={vm.step}
        onIndexChange={vm.onPageChange}
        progress={progress}
        inset={theme.spacing.xxl}
        renderPage={renderPage}
      />

      <LayoutAnimationConfig skipEntering>
        <Animated.View layout={layoutMotion.settle} style={styles.actions}>
          <PageDots count={vm.dotCount} index={vm.step} progress={progress} />
          <Button
            label={vm.primaryLabel}
            onPress={vm.onPrimary}
            loading={vm.finishing}
            testID="onboarding-primary"
          />
          {vm.showHaveAccount && (
            <Animated.View entering={layoutMotion.fade.in} exiting={layoutMotion.fade.out}>
              <Button
                label="I already have an account"
                variant="ghost"
                onPress={vm.onHaveAccount}
                testID="onboarding-have-account"
              />
            </Animated.View>
          )}
        </Animated.View>
      </LayoutAnimationConfig>
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  content: { gap: theme.spacing.xl, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  actions: { gap: theme.spacing.xl },
}));
