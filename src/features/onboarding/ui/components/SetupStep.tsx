import { memo } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { StepDirection, ValueField, WeightUnit } from '@/features/training/domain/preferences';
import { Card, SectionLabel, SegmentedControl, type SegmentOption } from '@/shared/ui';

import { StepHeading } from './StepHeading';
import { StepperRow } from './StepperRow';

export interface SetupStepProps {
  unit: WeightUnit;
  unitOptions: readonly SegmentOption<WeightUnit>[];
  bodyweightLabel: string;
  heightLabel: string;
  restLabel: string;
  /** What each value opens into when it is held, to be typed. */
  bodyweightInput: readonly ValueField[];
  heightInput: readonly ValueField[];
  restInput: readonly ValueField[];
  onUnitChange: (unit: WeightUnit) => void;
  onBodyweightStep: (direction: StepDirection) => void;
  onHeightStep: (direction: StepDirection) => void;
  onRestStep: (direction: StepDirection) => void;
  onBodyweightType: (parts: readonly string[]) => boolean;
  onHeightType: (parts: readonly string[]) => boolean;
  onRestType: (parts: readonly string[]) => boolean;
}

/**
 * Set up: units, bodyweight, height and rest, asked once so they are never asked mid-workout. Each is a
 * label, its value and its control — nothing to read first. A short hold on a value opens it for typing,
 * for a number far from where it starts. One page, not four: every extra screen is a
 * tap between opening Teras and logging a set.
 * A pager page: memoised, so it re-renders only when one of its own values changes.
 */
export const SetupStep = memo(function SetupStep({
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
}: SetupStepProps) {
  return (
    <View style={styles.step}>
      <StepHeading title="Set up" />

      <View style={styles.group}>
        <SectionLabel>Units</SectionLabel>
        <SegmentedControl
          options={unitOptions}
          value={unit}
          onChange={onUnitChange}
          accessibilityLabel="Units"
          testID="setup-unit"
        />
      </View>

      {/* One surface for the three numbers: each row is its own label, value and control. */}
      <Card tight divided>
        <StepperRow
          label="Bodyweight"
          value={bodyweightLabel}
          onStep={onBodyweightStep}
          input={bodyweightInput}
          decimal
          onType={onBodyweightType}
          decreaseLabel="Decrease bodyweight"
          increaseLabel="Increase bodyweight"
          testID="setup-bodyweight"
        />
        <StepperRow
          label="Height"
          value={heightLabel}
          onStep={onHeightStep}
          input={heightInput}
          onType={onHeightType}
          decreaseLabel="Decrease height"
          increaseLabel="Increase height"
          testID="setup-height"
        />
        <StepperRow
          label="Rest"
          value={restLabel}
          onStep={onRestStep}
          input={restInput}
          onType={onRestType}
          decreaseLabel="Shorter rest"
          increaseLabel="Longer rest"
          testID="setup-rest"
        />
      </Card>
    </View>
  );
});

const styles = StyleSheet.create((theme) => ({
  step: { gap: theme.spacing.xl },
  group: { gap: theme.spacing.sm },
}));
