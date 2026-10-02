import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { HeatLevel } from '@/theme';

import { HeatCell } from './HeatCell';
import { Text } from './Text';

export interface LevelChipProps {
  level: HeatLevel;
  /** The level's name ("Strong"): the colour is never the only cue. */
  label: string;
}

/** A day's heat level as its swatch and its name, the way the wave colours that day. */
export function LevelChip({ level, label }: LevelChipProps) {
  return (
    <View style={styles.chip}>
      <HeatCell level={level} size={12} radius={3} outlined={level === 0} />
      <Text variant="caption" tone="secondary" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
