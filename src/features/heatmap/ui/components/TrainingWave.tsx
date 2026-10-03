import { memo } from 'react';
import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Card, HeatmapMonths, Icon, Legend, PressableScale, Text, type HeatmapMonth } from '@/shared/ui';
import { motion } from '@/theme';

export interface TrainingWaveHeader {
  /** "Training wave". */
  title: string;
  /** "Aug – Oct 2026 · 8 workouts". */
  subtitle: string;
  /** The header is the way into the full Calendar. */
  onPress: () => void;
}

export interface TrainingWaveProps {
  /** Rows of months side by side, newest row first: Home shows one, the Calendar every one. */
  rows: readonly (readonly HeatmapMonth[])[];
  dayLabels: readonly string[];
  onDayPress: (day: string) => void;
  /** The day whose detail is open, ringed. */
  selected?: string | null;
  /** What "more" is measured against, under the cells. */
  legendCaption: string;
  header?: TrainingWaveHeader;
  testID?: string;
}

/**
 * The training wave: the panel Home and the Calendar both draw their heatmap on. One raised panel, its
 * days printed flat on it — depth is spent on the panel, never on dozens of floating cells. Every row
 * shares one cell size, so the Calendar's months line up under Home's.
 */
export const TrainingWave = memo(function TrainingWave({
  rows,
  dayLabels,
  onDayPress,
  selected = null,
  legendCaption,
  header,
  testID,
}: TrainingWaveProps) {
  const { theme } = useUnistyles();
  const columns = Math.max(
    0,
    ...rows.map((row) => row.reduce((sum, month) => sum + month.grid.columns.length, 0)),
  );

  return (
    <Card testID={testID} style={styles.panel}>
      {header && (
        <PressableScale
          onPress={header.onPress}
          scaleTo={motion.press.subtleScale}
          accessibilityRole="button"
          accessibilityLabel={`${header.title}, ${header.subtitle}`}
          accessibilityHint="Opens the calendar"
          style={styles.header}
          testID={testID && `${testID}-open`}
        >
          <View style={styles.titles}>
            <Text variant="headline">{header.title}</Text>
            <Text variant="footnote" tone="secondary">
              {header.subtitle}
            </Text>
          </View>
          {/* A small raised key: it reads as the thing to press, like the app's other icon keys. */}
          <View style={styles.key}>
            <Icon name="chevron-right" size={18} color={theme.colors.text} />
          </View>
        </PressableScale>
      )}
      <View style={styles.rows}>
        {rows.map((row, index) => (
          <HeatmapMonths
            key={row[0]?.key ?? index}
            months={row}
            dayLabels={dayLabels}
            onDayPress={onDayPress}
            selected={selected}
            columns={columns}
          />
        ))}
      </View>
      <Legend caption={legendCaption} />
    </Card>
  );
});

const KEY = 34;

const styles = StyleSheet.create((theme) => ({
  panel: { gap: theme.spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, minHeight: 44 },
  titles: { flex: 1, gap: 1 },
  key: {
    width: KEY,
    height: KEY,
    borderRadius: KEY / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.material.raisedSm.background,
    boxShadow: theme.material.raisedSm.shadow,
  },
  rows: { gap: 18 },
}));
