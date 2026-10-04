import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Card, SheetLayout, StatTile, StepperRow, Text } from '@/shared/ui';

import { useFfmiViewModel } from './useFfmiViewModel';

/** Form sheet over Profile: fat-free mass index, from the bodyweight and a body-fat figure. */
export function FfmiSheet() {
  const vm = useFfmiViewModel();

  return (
    <SheetLayout title="FFMI" onClose={vm.onClose} testID="ffmi-sheet">
      <Text variant="footnote" tone="secondary">
        Fat-free mass index: how much lean mass you carry for your height.
      </Text>
      <Card tight>
        <StepperRow
          label="Body fat"
          value={vm.bodyFat}
          onStep={vm.onStepBodyFat}
          decreaseLabel="Lower body fat"
          increaseLabel="Higher body fat"
          testID="ffmi-body-fat"
        />
      </Card>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <StatTile label="FFMI" value={vm.ffmi} labelFirst testID="ffmi-index" />
        </View>
        <View style={styles.stat}>
          <StatTile label="Lean mass" value={vm.leanMass} labelFirst testID="ffmi-lean-mass" />
        </View>
      </View>
      <Text variant="mini" tone="tertiary">
        A rough estimate that depends on your body-fat figure. Not medical advice.
      </Text>
    </SheetLayout>
  );
}

const styles = StyleSheet.create((theme) => ({
  stats: { flexDirection: 'row', gap: theme.spacing.sm },
  stat: { flex: 1 },
}));
