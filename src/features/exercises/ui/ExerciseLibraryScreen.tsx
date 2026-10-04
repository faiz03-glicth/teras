import { Button, NavBar, Screen, Text } from '@/shared/ui';

import { ExerciseBrowser } from './components/ExerciseBrowser';
import { useExerciseLibraryViewModel } from './useExerciseLibraryViewModel';

/** Every exercise, from the Workout tab: browse, and open one for its records and history. */
export function ExerciseLibraryScreen() {
  const vm = useExerciseLibraryViewModel();

  return (
    <Screen list testID="exercise-library-screen">
      <ExerciseBrowser
        browser={vm.browser}
        onPick={vm.onOpen}
        onInfo={vm.onOpen}
        header={
          <>
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
              Exercises
            </Text>
          </>
        }
      />
    </Screen>
  );
}
