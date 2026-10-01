import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { IconButton, Text } from '@/shared/ui';

export interface StepperRowProps {
  label: string;
  value: string;
  onStep: (direction: 1 | -1) => void;
  decreaseLabel: string;
  increaseLabel: string;
  testID?: string;
}

/** While a button is held the stepper repeats this often. */
export const HOLD_REPEAT_MS = 100;

/** A labelled value with − and + buttons either side of it. Tap for one step; hold to keep going. */
export function StepperRow({ label, value, onStep, decreaseLabel, increaseLabel, testID }: StepperRowProps) {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  // The interval outlives the render that started it, so it reads the latest handler from here.
  const step = useRef(onStep);
  useEffect(() => {
    step.current = onStep;
  });

  const stopHold = () => {
    if (timer.current !== null) clearInterval(timer.current);
    timer.current = null;
  };
  useEffect(() => stopHold, []);

  const startHold = (direction: 1 | -1) => {
    stopHold();
    timer.current = setInterval(() => step.current(direction), HOLD_REPEAT_MS);
  };

  return (
    <View style={styles.row} testID={testID}>
      <Text variant="body" style={styles.label}>
        {label}
      </Text>
      <IconButton
        icon="minus"
        onPress={() => onStep(-1)}
        onLongPress={() => startHold(-1)}
        onPressOut={stopHold}
        accessibilityLabel={decreaseLabel}
        testID={testID ? `${testID}-minus` : undefined}
      />
      <Text
        variant="headline"
        align="center"
        style={styles.value}
        testID={testID ? `${testID}-value` : undefined}
      >
        {value}
      </Text>
      <IconButton
        icon="plus"
        onPress={() => onStep(1)}
        onLongPress={() => startHold(1)}
        onPressOut={stopHold}
        accessibilityLabel={increaseLabel}
        testID={testID ? `${testID}-plus` : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, minHeight: 48 },
  label: { flex: 1 },
  value: { minWidth: 96, fontVariant: ['tabular-nums'] },
}));
