import { memo } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { UNIT_SYSTEMS, type StepDirection, type WeightUnit } from '@/features/training/domain/preferences';
import { Card, SectionLabel, SegmentedControl, Text, type SegmentOption } from '@/shared/ui';

import { StepHeading } from './StepHeading';
import { StepperRow } from './StepperRow';

export interface SetupStepProps {
  unit: WeightUnit;
  unitOptions: readonly SegmentOption<WeightUnit>[];
  bodyweightLabel: string;
  heightLabel: string;
  restLabel: string;
  onUnitChange: (unit: WeightUnit) => void;
  onBodyweightStep: (direction: StepDirection) => void;
  onHeightStep: (direction: StepDirection) => void;
  onRestStep: (direction: StepDirection) => void;
}

/**
 * Set up: units, bodyweight, height and default rest, asked once so they are never asked mid-workout.
 * A pager page: memoised, so it re-renders only when one of its own values changes.
 */
export const SetupStep = memo(function SetupStep({
  unit,
  unitOptions,
  bodyweightLabel,
  heightLabel,
  restLabel,
  onUnitChange,
  onBodyweightStep,
  onHeightStep,
  onRestStep,
}: SetupStepProps) {
  return (
    <View style={styles.step}>
      <StepHeading title="Set up your training" body="You can change all of this later in Profile." />

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

      <View style={styles.group}>
        <SectionLabel>Body</SectionLabel>
        <Card tight divided>
          <StepperRow
            label={`Bodyweight (${UNIT_SYSTEMS[unit].weight})`}
            value={bodyweightLabel}
            onStep={onBodyweightStep}
            decreaseLabel="Decrease bodyweight"
            increaseLabel="Increase bodyweight"
            testID="setup-bodyweight"
          />
          <StepperRow
            label={`Height (${UNIT_SYSTEMS[unit].height})`}
            value={heightLabel}
            onStep={onHeightStep}
            decreaseLabel="Decrease height"
            increaseLabel="Increase height"
            testID="setup-height"
          />
        </Card>
        <Text variant="footnote" tone="secondary">
          Bodyweight counts in pull-ups and dips. Hold − or + to run through the numbers.
        </Text>
      </View>

      <View style={styles.group}>
        <SectionLabel>Rest between sets</SectionLabel>
        <Card tight>
          <StepperRow
            label="Default rest"
            value={restLabel}
            onStep={onRestStep}
            decreaseLabel="Shorter rest"
            increaseLabel="Longer rest"
            testID="setup-rest"
          />
        </Card>
      </View>
    </View>
  );
});

const styles = StyleSheet.create((theme) => ({
  step: { gap: theme.spacing.xl },
  group: { gap: theme.spacing.sm },
}));
