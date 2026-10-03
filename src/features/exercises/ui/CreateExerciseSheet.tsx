import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Button, ChipRow, SectionLabel, SheetLayout, TextField } from '@/shared/ui';

import { useCreateExerciseViewModel } from './useCreateExerciseViewModel';

/** Form sheet over the exercise browser: add an exercise of their own. */
export function CreateExerciseSheet() {
  const vm = useCreateExerciseViewModel();

  return (
    <SheetLayout title="Create exercise" onClose={vm.onClose} keyboard testID="create-exercise-sheet">
      <View style={styles.group}>
        <SectionLabel>Name</SectionLabel>
        <TextField
          label="Name"
          value={vm.name}
          onChangeText={vm.onNameChange}
          placeholder="e.g. Landmine Press"
          error={vm.error}
          autoCapitalize="words"
          autoCorrect={false}
          maxLength={60}
          returnKeyType="done"
          testID="create-exercise-name"
        />
      </View>

      <View style={styles.group}>
        <SectionLabel>Equipment</SectionLabel>
        <ChipRow
          options={vm.equipmentOptions}
          value={vm.equipment}
          onChange={vm.onEquipmentChange}
          accessibilityLabel="Equipment"
          testID="create-equipment"
        />
      </View>

      <View style={styles.group}>
        <SectionLabel>Primary muscle</SectionLabel>
        <ChipRow
          options={vm.muscleOptions}
          value={vm.muscle}
          onChange={vm.onMuscleChange}
          accessibilityLabel="Primary muscle"
          testID="create-muscle"
        />
      </View>

      <Button
        label="Create exercise"
        onPress={vm.onCreate}
        loading={vm.busy}
        loadingLabel="Creating"
        testID="create-exercise-submit"
      />
    </SheetLayout>
  );
}

const styles = StyleSheet.create((theme) => ({
  group: { gap: theme.spacing.sm },
}));
