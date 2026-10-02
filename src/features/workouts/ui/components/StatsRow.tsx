import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from '@/shared/ui';

export interface Stat {
  label: string;
  value: string;
}

/**
 * A workout's numbers side by side — Time, Volume, Sets — read as one line by a screen reader. Shared by
 * the workout in progress, the saved summary and a logged workout, so the three always look alike.
 */
export function StatsRow({ stats, testID }: { stats: readonly Stat[]; testID?: string }) {
  return (
    <View
      style={styles.stats}
      accessible
      accessibilityLabel={stats.map((stat) => `${stat.label}, ${stat.value}`).join('. ')}
      testID={testID}
    >
      {stats.map((stat) => (
        <View key={stat.label} style={styles.stat}>
          <Text variant="caption" tone="secondary">
            {stat.label}
          </Text>
          <Text variant="headline" style={styles.number}>
            {stat.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  stats: { flexDirection: 'row', gap: theme.spacing.md },
  stat: { flex: 1, gap: 2 },
  number: { fontVariant: ['tabular-nums'] },
}));
