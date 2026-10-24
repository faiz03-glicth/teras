import { memo } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Card, Icon, IconButton, Text } from '@/shared/ui';
import { layoutMotion } from '@/theme';

import { MuscleWeekMap } from './components/MuscleWeekMap';
import { useMusclesThisWeek } from './useMusclesThisWeek';

const KEEP_THIS_UP = 'Every muscle, twice this week';

/**
 * Home's "Muscles this week": the body, front and back, each muscle shaded by how many times it was hit from
 * Monday (not yet, once, twice or more), with the count of muscles that reached the goal. When every muscle
 * is twice the "Keep this up" banner joins it. While the week loads the map is drawn with nothing hit, so the
 * card keeps its height.
 */
export const MusclesThisWeekCard = memo(function MusclesThisWeekCard() {
  const vm = useMusclesThisWeek();
  return (
    <Card style={styles.card} testID="muscles-week-card">
      {vm.showBanner && <KeepThisUp onDismiss={vm.onDismissBanner} />}
      <View style={styles.head}>
        <Text variant="headline" accessibilityRole="header">
          Muscles this week
        </Text>
        <Text variant="footnote" tone="secondary" style={styles.line} testID="muscles-week-line">
          {vm.line}
        </Text>
      </View>
      <View
        style={styles.well}
        accessible
        accessibilityRole="image"
        accessibilityLabel={vm.accessibilityLabel}
        testID="muscles-week-map-box"
      >
        <MuscleWeekMap tiers={vm.tiers} />
      </View>
      <TierLegend />
    </Card>
  );
});

/** Not yet, once, twice: the three looks of a muscle on the map. */
const TierLegend = memo(function TierLegend() {
  const { theme } = useUnistyles();
  const { muscleNone, muscleOnce, muscleTwice } = theme.colors;
  return (
    <View style={styles.legend} testID="muscles-week-legend">
      <LegendItem color={muscleNone} label="Not yet" />
      <LegendItem color={muscleOnce} label="Once" />
      <LegendItem color={muscleTwice} label="Twice" />
    </View>
  );
});

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={styles.swatch(color)} />
      <Text variant="caption" tone="tertiary">
        {label}
      </Text>
    </View>
  );
}

/** Every muscle twice this week: a gold trophy, a line of praise, and a way to put it away. */
function KeepThisUp({ onDismiss }: { onDismiss: () => void }) {
  const { theme } = useUnistyles();
  return (
    <Animated.View
      entering={layoutMotion.fadeUp}
      exiting={layoutMotion.fade.out}
      style={styles.banner}
      testID="muscles-week-banner"
    >
      <View style={styles.trophy}>
        <Icon name="trophy" size={20} color={theme.colors.onAccent} />
      </View>
      <View
        style={styles.bannerText}
        accessible
        accessibilityLiveRegion="polite"
        accessibilityLabel={`${KEEP_THIS_UP}. Keep this up!`}
      >
        <Text variant="body" weight="semibold">
          {KEEP_THIS_UP}
        </Text>
        <Text variant="footnote" tone="secondary">
          Keep this up!
        </Text>
      </View>
      <IconButton icon="close" plain accessibilityLabel="Dismiss" onPress={onDismiss} />
    </Animated.View>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: { gap: theme.spacing.md },
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  line: { flexShrink: 1, textAlign: 'right' },
  // The map's own card: in Walnut a lighter walnut so the figure and its muscles read; in Parchment, the card.
  well: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.bodyCanvas,
  },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: (color: string) => ({ width: 11, height: 11, borderRadius: 3, backgroundColor: color }),
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    paddingLeft: theme.spacing.sm,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.accentSoft,
  },
  trophy: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    borderWidth: 1,
    borderColor: theme.colors.accentEdge,
  },
  bannerText: { flex: 1 },
}));
