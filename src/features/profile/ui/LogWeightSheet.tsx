import { StyleSheet } from 'react-native-unistyles';

import { Button, Card, SheetLayout, StepperRow, Text } from '@/shared/ui';

import { useLogWeightViewModel } from './useLogWeightViewModel';

/** Form sheet over Profile: today's weight, for the BMI and for bodyweight exercises. */
export function LogWeightSheet() {
  const vm = useLogWeightViewModel();

  return (
    <SheetLayout title="Log weight" onClose={vm.onClose} keyboard testID="log-weight-sheet">
      <Card tight>
        <StepperRow
          label="Bodyweight"
          value={vm.value}
          onStep={vm.onStep}
          input={vm.input}
          decimal
          onType={vm.onType}
          decreaseLabel="Decrease bodyweight"
          increaseLabel="Increase bodyweight"
          testID="log-weight"
        />
      </Card>
      <Text variant="footnote" tone="secondary" style={styles.note}>
        Used for BMI and for bodyweight exercises like pull-ups and dips.
      </Text>
      <Button
        label="Save"
        onPress={() => void vm.onSave()}
        loading={vm.saving}
        loadingLabel="Saving…"
        testID="log-weight-save"
      />
    </SheetLayout>
  );
}

const styles = StyleSheet.create((theme) => ({
  note: { marginHorizontal: theme.spacing.xs },
}));
