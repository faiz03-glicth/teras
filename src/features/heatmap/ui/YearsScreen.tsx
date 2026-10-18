import { useCallback, useMemo } from 'react';
import { FlatList, View, useWindowDimensions, type ListRenderItem } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useWorkoutOwner } from '@/features/workouts/hooks/useWorkoutQueries';
import { goBack, openCalendarYear, useScreenSettled } from '@/shared/actions';
import { useToday } from '@/shared/lib/date/useToday';
import { ErrorState, Icon, LoadingState, PressDelay, SectionLabel, Text } from '@/shared/ui';
import { motion } from '@/theme';

import { countsLabel, isLocked, totalsOf } from '../domain/yearCalendar';
import { useCalendarYears, useYearDays } from '../hooks/useYearCalendar';
import { CalendarHeader, CalendarHint, CalendarLegend, FlatCard, GoldKey } from './components/CalendarParts';
import { STRIP_INSET, YearCard } from './components/YearCard';

/** The year card's sides (13 each), inside the screen's gutters. */
const CARD_PADDING = 26;
/**
 * Years built while the Calendar slides in: a screenful on a tall phone, their strips held back. The rest
 * follow once it has settled, so the slide neither builds nor draws them.
 */
const FIRST_YEARS = 6;

/**
 * Level 1 of the Calendar (Profile › Dashboard › Calendar): every year with something logged, newest first,
 * each one strip. Older years mount as they scroll in, and each reads only its own year.
 */
export function YearsScreen() {
  const { theme } = useUnistyles();
  const owner = useWorkoutOwner();
  const today = useToday();
  const { width } = useWindowDimensions();
  const { years, status, retry } = useCalendarYears(owner);
  const stripWidth = width - theme.spacing.gutter * 2 - CARD_PADDING - STRIP_INSET;
  const settled = useScreenSettled();
  const shown = useMemo(() => (settled ? years : years.slice(0, FIRST_YEARS)), [settled, years]);

  const renderItem = useCallback<ListRenderItem<number>>(
    ({ item }) => (
      <YearCard
        year={item}
        today={today}
        stripWidth={stripWidth}
        settled={settled}
        onPress={openCalendarYear}
      />
    ),
    [settled, stripWidth, today],
  );

  const locked = status === 'ready' && isLocked(years);
  const header = (
    <View style={styles.header}>
      <CalendarHeader title="Calendar" backLabel="Back" onBack={() => goBack()} />
      {!locked && status === 'ready' && <SectionLabel>Your years</SectionLabel>}
    </View>
  );

  let footer = null;
  if (status === 'loading') footer = <LoadingState label="Loading your years" testID="calendar-loading" />;
  else if (status === 'error')
    footer = <ErrorState title="Couldn't load your years" onRetry={retry} testID="calendar-error" />;
  else if (locked) footer = <LockedCard years={years} />;
  else
    footer = (
      <View style={styles.footer}>
        <CalendarLegend />
        <CalendarHint>Tap a year for its months.</CalendarHint>
      </View>
    );

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.root} testID="calendar-screen">
      <PressDelay value={motion.scroll.pressDelayMs}>
        <FlatList
          data={locked || status !== 'ready' ? [] : shown}
          keyExtractor={String}
          renderItem={renderItem}
          ListHeaderComponent={header}
          ListFooterComponent={footer}
          ItemSeparatorComponent={Separator}
          contentContainerStyle={styles.content}
          initialNumToRender={FIRST_YEARS}
          windowSize={5}
        />
      </PressDelay>
    </SafeAreaView>
  );
}

/**
 * Fewer than two years logged: no strips yet, one card that says why and offers the way in, last year's
 * months (all empty), where a first earlier day can be logged.
 */
function LockedCard({ years }: { years: readonly number[] }) {
  const { theme } = useUnistyles();
  const owner = useWorkoutOwner();
  const thisYear = Number(useToday().slice(0, 4));
  const only = years[0] ?? thisYear;
  const { data } = useYearDays(owner, only);
  const totals = data ? totalsOf(data) : { workouts: 0, noDetails: 0 };
  const sofar =
    years.length === 0
      ? 'Nothing is logged yet.'
      : `So far, ${only} only · ${countsLabel(totals.workouts, totals.noDetails)}.`;
  const earlier = only === thisYear ? thisYear - 1 : thisYear;

  return (
    <View style={styles.lockedWrap} testID="calendar-locked">
      <FlatCard style={styles.locked}>
        <View style={styles.well}>
          <Icon name="calendar" size={26} color={theme.colors.accentText} />
        </View>
        <Text variant="title3" align="center">
          Your years show here
        </Text>
        <Text variant="sub" tone="secondary" align="center">
          {`Once there are days logged in two years: this one and an earlier one. ${sofar}`}
        </Text>
        <GoldKey
          label="Log a day from an earlier year"
          onPress={() => openCalendarYear(earlier)}
          testID="calendar-locked-log"
        />
      </FlatCard>
      <CalendarHint>This year is on Home’s wave, up to 6 months back.</CalendarHint>
    </View>
  );
}

const Separator = () => <View style={styles.separator} />;

const styles = StyleSheet.create((theme) => ({
  root: { flex: 1 },
  content: { paddingHorizontal: theme.spacing.gutter, paddingBottom: theme.spacing.xxxl * 2 },
  header: { gap: theme.spacing.lg, paddingBottom: theme.spacing.md },
  footer: { paddingTop: theme.spacing.xl, gap: theme.spacing.xs },
  separator: { height: 10 },
  lockedWrap: { paddingTop: theme.spacing.xxl, gap: theme.spacing.xs },
  locked: {
    borderRadius: 20,
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  well: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.subtle,
  },
}));
