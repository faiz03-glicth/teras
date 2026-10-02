import { StyleSheet } from 'react-native-unistyles';

import { ExerciseBrowser } from '@/features/exercises/ui/components/ExerciseBrowser';
import { NavBar, Screen, Text } from '@/shared/ui';

import { useAddExerciseViewModel } from './useAddExerciseViewModel';

/** The exercise browser, for the workout in progress: tap one and it joins the workout. */
export function AddExerciseScreen() {
  const vm = useAddExerciseViewModel();

  return (
    <Screen scroll keyboard testID="add-exercise-screen" contentStyle={styles.content}>
      <NavBar onBack={vm.onBack} />

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
