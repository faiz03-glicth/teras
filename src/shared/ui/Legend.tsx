import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { HeatLevel } from '@/theme';

import { HeatCell } from './HeatCell';
import { Text } from './Text';

const LEVELS: readonly HeatLevel[] = [0, 1, 2, 3, 4];

export interface LegendProps {
  /** What "more" is measured against, at the far end ("vs your last 90 days"). */
  caption?: string;
}

/** Less → More: the five heat colours in order, drawn exactly as the wave draws them. */
export function Legend({ caption }: LegendProps) {
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`Colour scale from no workout to peak${caption ? `, ${caption}` : ''}`}
    >
      <Text variant="mini" tone="tertiary">
        Less
      </Text>
      {LEVELS.map((level) => (
        <HeatCell key={level} level={level} size={11} radius={3} outlined={level === 0} />
      ))}
      <Text variant="mini" tone="tertiary">
        More
      </Text>
      {caption ? (
        <Text variant="mini" tone="tertiary" numberOfLines={1} style={styles.caption}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  caption: { flex: 1, textAlign: 'right' },
});
