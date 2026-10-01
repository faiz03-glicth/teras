import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { HeatLevel } from '@/theme';

import { HeatCell } from './HeatCell';
import { Text } from './Text';

const LEVELS: readonly HeatLevel[] = [0, 1, 2, 3, 4];

/** Less → More: the five heat colours in order. */
export function Legend() {
  return (
    <View style={styles.row} accessible accessibilityLabel="Colour scale from less to more check-ins">
      <Text variant="mini" tone="tertiary">
        Less
      </Text>
      {LEVELS.map((level) => (
        <HeatCell key={level} level={level} size={11} radius={3} />
      ))}
      <Text variant="mini" tone="tertiary">
        More
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
