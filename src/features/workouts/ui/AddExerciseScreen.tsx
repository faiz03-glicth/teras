import { StyleSheet } from 'react-native-unistyles';

import { ExerciseBrowser } from '@/features/exercises/ui/components/ExerciseBrowser';
import type { AddExerciseTarget } from '@/shared/actions';
import { Button, NavBar, Screen, Text } from '@/shared/ui';

import { useAddExerciseViewModel } from './useAddExerciseViewModel';

/** The exercise browser, for the workout in progress (or the routine being edited): tap one and it joins. */
export function AddExerciseScreen({ target = 'workout' }: { target?: AddExerciseTarget }) {
  const vm = useAddExerciseViewModel(target);

  return (
    <Screen scroll keyboard testID="add-exercise-screen" contentStyle={styles.content}>
      <NavBar
        onBack={vm.onBack}
        right={
          <Button
            label="Create"
            icon="plus"
            variant="quiet"
            onPress={vm.browser.onCreate}
            testID="exercise-create"
          />
        }
      />

      <Text variant="title" accessibilityRole="header">
        Add exercise
      </Text>

      <ExerciseBrowser browser={vm.browser} onPick={vm.onPick} onInfo={vm.onInfo} />
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  content: { gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
}));
