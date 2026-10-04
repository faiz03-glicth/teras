import { ExerciseBrowser } from '@/features/exercises/ui/components/ExerciseBrowser';
import type { AddExerciseTarget } from '@/shared/actions';
import { Button, NavBar, Screen, Text } from '@/shared/ui';

import { useAddExerciseViewModel } from './useAddExerciseViewModel';

/** The exercise browser, for the workout in progress (or the routine being edited): tap one and it joins. */
export function AddExerciseScreen({ target = 'workout' }: { target?: AddExerciseTarget }) {
  const vm = useAddExerciseViewModel(target);

  return (
    <Screen list testID="add-exercise-screen">
      <ExerciseBrowser
        browser={vm.browser}
        onPick={vm.onPick}
        onInfo={vm.onInfo}
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
              Add exercise
            </Text>
          </>
        }
      />
    </Screen>
  );
}
