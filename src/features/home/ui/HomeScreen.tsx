import { memo, useCallback, useMemo, useState, type ComponentProps, type Ref } from 'react';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { View, type ViewProps } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { TrainingWave } from '@/features/heatmap/ui/components/TrainingWave';
import { MusclesThisWeekCard } from '@/features/muscles/ui/MusclesThisWeekCard';
import { haptics } from '@/shared/lib/haptics';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Screen,
  SectionLabel,
  Text,
  useTabBarRoom,
} from '@/shared/ui';

import { FeedCard } from './components/FeedCard';
import { WeekChip } from './components/WeekChip';

import { useHomeSelectedDay, useHomeViewModel, type FeedEntry, type HomeViewModel } from './useHomeViewModel';

/*
 * A card past the end of the feed for a render draws nothing, as the exercise browser's rows do (see its
 * `itemKey`): FlashList 2.0.2 can ask about one while the feed shrinks.
 */
const feedKey = (entry: FeedEntry | undefined, index: number): string => entry?.id ?? `gone-${index}`;

// A workout added at the top (or the wave opening above the cards) must push the cards down, not scroll
// Home to keep them still: Home stays at its top, the title and wave in view.
const KEEP_PLACE = { disabled: true } as const;

/**
 * Home: the training wave on top, the week's muscles, then the workouts behind them. The workouts are a recycling list: only the
 * cards on screen and a little below exist, so coming back to Home (from another tab, or a workout opened
 * from it) attaches and draws a screenful again, not the whole feed.
 */
export function HomeScreen() {
  const vm = useHomeViewModel();
  const room = useTabBarRoom();
  const { onOpenWorkout } = vm;
  const renderItem: ListRenderItem<FeedEntry> = useCallback(
    ({ item }: { item: FeedEntry | undefined }) =>
      item === undefined ? null : <FeedCard entry={item} onPress={onOpenWorkout} />,
    [onOpenWorkout],
  );

  return (
    <Screen list testID="home-screen">
      <FlashList
        data={vm.entries}
        keyExtractor={feedKey}
        maintainVisibleContentPosition={KEEP_PLACE}
        renderItem={renderItem}
        CellRendererComponent={FeedCell}
        ItemSeparatorComponent={FeedGap}
        ListHeaderComponent={<HomeHeader vm={vm} />}
        contentContainerStyle={styles.list(room)}
        keyboardShouldPersistTaps="handled"
        testID="home-feed"
      />
    </Screen>
  );
}

/** Everything above the cards: the title, the wave, Start workout, and the feed's heading or state. */
function HomeHeader({ vm }: { vm: HomeViewModel }) {
  return (
    <View style={styles.header}>
      <View style={styles.headRow}>
        <View style={styles.head}>
          <Text variant="title" accessibilityRole="header">
            Home
          </Text>
          <Text variant="footnote" tone="secondary">
            {vm.dateLine}
          </Text>
        </View>
        <WeekChip label={vm.week.label} accessibilityLabel={vm.week.accessibilityLabel} />
      </View>

      <HomeWave
        wave={vm.wave}
        dayLabels={vm.dayLabels}
        onDayPress={vm.onDayPress}
        legendCaption={vm.legendCaption}
      />

      {vm.canStart && (
        <Button
          label="Start workout"
          icon="plus"
          size="lg"
          onPress={vm.onStartWorkout}
          loading={vm.starting}
          loadingLabel="Starting"
          testID="home-start-workout"
        />
      )}

      <MusclesThisWeekCard />

      <View style={[styles.group, vm.entries.length > 0 && styles.beforeCards]}>
        <SectionLabel>Workouts</SectionLabel>
        {vm.status === 'loading' && <LoadingState label="Loading workouts" testID="home-loading" />}
        {vm.status === 'error' && (
          <Card>
            <ErrorState title="Couldn't load workouts" onRetry={vm.onRetry} testID="home-error" />
          </Card>
        )}
        {vm.empty && (
          <Card>
            <EmptyState icon="dumbbell" title="No workouts yet" />
          </Card>
        )}
      </View>
    </View>
  );
}

/**
 * A card's cell, drawn in feed order as a column draws its cards: each card's light falls on the card
 * above it, and its shadow lies under the card below. The list reuses cells in any order, so the order
 * they are drawn in is said outright.
 */
function FeedCell({ index, style, ...props }: ViewProps & { index: number; ref?: Ref<View> }) {
  return <View {...props} style={[style, { zIndex: index }]} />;
}

const FeedGap = () => <View style={styles.gap} />;

type WaveVersion = { rows: ComponentProps<typeof TrainingWave>['rows']; subtitle: string };
type HomeWaveProps = Omit<ComponentProps<typeof TrainingWave>, 'selected' | 'testID' | 'rows' | 'header'> & {
  wave: { collapsed: WaveVersion; expanded: WaveVersion };
};

/**
 * The wave owns the selected-day subscription and whether it shows three months or six, so tapping a day
 * or its header re-renders the wave and not all of Home.
 */
const HomeWave = memo(function HomeWave({ wave, ...props }: HomeWaveProps) {
  const selected = useHomeSelectedDay();
  const [expanded, setExpanded] = useState(false);
  const onToggle = useCallback(() => {
    haptics.selection();
    setExpanded((open) => !open);
  }, []);
  const shown = expanded ? wave.expanded : wave.collapsed;
  const header = useMemo(
    () => ({ title: 'Training wave', subtitle: shown.subtitle, expanded, onToggle }),
    [expanded, onToggle, shown.subtitle],
  );
  return (
    <TrainingWave {...props} rows={shown.rows} header={header} testID="training-wave" selected={selected} />
  );
});

const styles = StyleSheet.create((theme) => ({
  list: (bottom: number) => ({ paddingHorizontal: theme.spacing.gutter, paddingBottom: bottom }),
  header: { gap: theme.spacing.xl },
  headRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  head: { gap: 2, flexShrink: 1 },
  group: { gap: theme.spacing.md },
  // The first card sits as far under the heading as the cards sit from each other.
  beforeCards: { paddingBottom: theme.spacing.md },
  gap: { height: theme.spacing.md },
}));
