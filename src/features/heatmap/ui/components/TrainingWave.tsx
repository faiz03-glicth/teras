import { memo } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Card, HeatmapMonths, Icon, Legend, PressableScale, Text, type HeatmapMonth } from '@/shared/ui';
import { motion, surfaceStyle, useReduceMotion } from '@/theme';

export interface TrainingWaveHeader {
  /** "Training wave". */
  title: string;
  /** "Aug – Oct 2026 · 8 workouts". */
  subtitle: string;
  /** Showing six months rather than three. */
  expanded?: boolean;
  /** Home: the header shows three months more, or three fewer (never the Calendar: that is on Profile). */
  onToggle?: () => void;
}

/** The second row of months fades in as one layer; its place is laid out once, never grown per frame. */
const ROW_FADE_MS = 220;

export interface TrainingWaveProps {
  /** Rows of months side by side, oldest row first and the latest at the bottom: Home shows one or two. */
  rows: readonly (readonly HeatmapMonth[])[];
  dayLabels: readonly string[];
  onDayPress: (day: string) => void;
  /** The day whose detail is open, ringed. */
  selected?: string | null;
  /** What "more" is measured against, under the cells. */
  legendCaption: string;
  header?: TrainingWaveHeader;
  testID?: string;
  /** Size cells as if the panel held this many week columns: a list that draws one row per panel keeps one cell size. */
  columns?: number;
  /** Draws the legend under the cells. Default true. */
  legend?: boolean;
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
  columns: sharedColumns = 0,
  legend = true,
}: TrainingWaveProps) {
  const { theme } = useUnistyles();
  const reduced = useReduceMotion();
  const columns = Math.max(
    sharedColumns,
    ...rows.map((row) => row.reduce((sum, month) => sum + month.grid.columns.length, 0)),
  );

  return (
    <Card testID={testID} style={styles.panel}>
      {header?.onToggle ? (
        <PressableScale
          onPress={header.onToggle}
          scaleTo={motion.press.subtleScale}
          accessibilityRole="button"
          accessibilityLabel={`${header.title}, ${header.subtitle}`}
          accessibilityHint={header.expanded ? 'Shows three months' : 'Shows six months'}
          accessibilityState={{ expanded: header.expanded ?? false }}
          style={styles.header}
          testID={testID && `${testID}-toggle`}
        >
          <View style={styles.titles}>
            <Text variant="headline">{header.title}</Text>
            <Text variant="footnote" tone="secondary">
              {header.subtitle}
            </Text>
          </View>
          {/* A small raised key (Home keeps the walnut material); its chevron turns over when open. */}
          <View style={styles.key}>
            <View style={styles.chevron(header.expanded ?? false)}>
              <Icon name="chevron-down" size={18} color={theme.colors.text} />
            </View>
          </View>
        </PressableScale>
      ) : header ? (
        <View
          style={styles.header}
          accessible
          accessibilityRole="header"
          accessibilityLabel={`${header.title}, ${header.subtitle}`}
        >
          <View style={styles.titles}>
            <Text variant="headline">{header.title}</Text>
            <Text variant="footnote" tone="secondary">
              {header.subtitle}
            </Text>
          </View>
        </View>
      ) : null}
      <View style={styles.rows}>
        {rows.map((row, index) => (
          <Animated.View
            key={row[0]?.key ?? index}
            // Every row but the latest is the one that opens; the latest stays mounted (same key), so only
            // the earlier months fade in.
            entering={index < rows.length - 1 && !reduced ? FadeIn.duration(ROW_FADE_MS) : undefined}
          >
            <HeatmapMonths
              months={row}
              dayLabels={dayLabels}
              onDayPress={onDayPress}
              selected={selected}
              columns={columns}
            />
          </Animated.View>
        ))}
      </View>
      {legend && <Legend caption={legendCaption} />}
    </Card>
  );
});

const styles = StyleSheet.create((theme) => ({
  panel: { gap: theme.spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, minHeight: 44 },
  titles: { flex: 1, gap: 1 },
  key: {
    width: 36,
    height: 36,
    borderRadius: theme.radii.key,
    alignItems: 'center',
    justifyContent: 'center',
    ...surfaceStyle(theme.material.raisedSm),
  },
  chevron: (open: boolean) => ({ transform: [{ rotate: open ? '180deg' : '0deg' }] }),
  rows: { gap: 18 },
}));
