import { StyleSheet } from 'react-native-unistyles';

import { NavBar, Screen, Text } from '@/shared/ui';

import { ExerciseBrowser } from './components/ExerciseBrowser';
import { useExerciseLibraryViewModel } from './useExerciseLibraryViewModel';

/** Every exercise, from the Workout tab: browse, and open one for its records and history. */
export function ExerciseLibraryScreen() {
  const vm = useExerciseLibraryViewModel();

  return (
    <Screen scroll keyboard testID="exercise-library-screen" contentStyle={styles.content}>
      <NavBar onBack={vm.onBack} />

      <Text variant="title" accessibilityRole="header">
        Exercises
      </Text>

      <ExerciseBrowser browser={vm.browser} onPick={vm.onOpen} onInfo={vm.onOpen} />
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  content: { gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
}));
