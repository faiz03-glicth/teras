import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { LEVEL_NAMES } from '@/features/workoutDays/domain/WorkoutDay';
import { useWorkoutOwner } from '@/features/workouts/hooks/useWorkoutQueries';
import { goBack, openDay, showCalendarMonth } from '@/shared/actions';
import { addMonths, monthLong, weekdayLetters } from '@/shared/lib/date/calendar';
import type { ISODate } from '@/shared/lib/date/isoDate';
import { useToday } from '@/shared/lib/date/useToday';
import { haptics } from '@/shared/lib/haptics';
import { ErrorState, PressableScale, Text } from '@/shared/ui';
import { useReduceMotion } from '@/theme';

import {
  countsLabel,
  monthDays,
  NO_DETAILS,
  totalsOf,
  type DayLook,
  type DayTile,
} from '../domain/yearCalendar';
import { useYearDays } from '../hooks/useYearCalendar';
import { useSelectedDayStore } from '../state/selectedDayStore';
import { CalendarHeader, CalendarHint, FLAT_PRESS, FlatCard, FlatKey } from './components/CalendarParts';

const LETTERS = weekdayLetters('mon');
const GAP = 5;
const CELL_HEIGHT = 44;
const RADIUS = 12;
/** The ring stands this far off its cell, and is this thick. */
const RING_OFFSET = 2;
const RING_WIDTH = 2;
const RING_OUT = RING_OFFSET + RING_WIDTH;
const FADE_OUT = { duration: 100, easing: Easing.bezier(0.4, 0, 1, 1) };
const FADE_IN = { duration: 160, easing: Easing.bezier(0.2, 0, 0, 1) };
const NOTHING = new Map<ISODate, DayLook>();

type Level = 0 | 1 | 2 | 3 | 4;
type Spot = { row: number; column: number };

const lookName = (look: DayLook) =>
  look === NO_DETAILS ? 'Logged, no details' : look === 0 ? 'Nothing logged' : LEVEL_NAMES[look];
const monthKey = ({ year, month }: { year: number; month: number }) =>
  `${year}-${String(month + 1).padStart(2, '0')}`;

/**
 * Level 3 of the Calendar: one month's days, each a real button that opens the day's sheet (where a past day
 * can be logged). ‹ › step months in place with a quick fade; one ring marks today, one the open day.
 */
export function MonthDaysScreen({ year, month }: { year: number; month: number }) {
  const owner = useWorkoutOwner();
  const today = useToday();
  const reduced = useReduceMotion();
  const selected = useSelectedDayStore((state) => state.day);
  const { data, status, retry } = useYearDays(owner, year);
  const looks = data?.looks ?? NOTHING;
  const weeks = useMemo(() => monthDays(year, month, looks, today), [looks, month, today, year]);
  const totals = data ? totalsOf(data, month) : null;
  const nextIsFuture = monthKey(addMonths({ year, month }, 1)) > today.slice(0, 7);

  // The grid fades out, the month swaps, and it fades back in once the new month is on screen.
  const opacity = useSharedValue(1);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  const swap = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    opacity.set(reduced ? 1 : withTiming(1, FADE_IN));
  }, [month, opacity, reduced, year]);
  useEffect(
    () => () => {
      if (swap.current) clearTimeout(swap.current);
    },
    [],
  );
  const step = useCallback(
    (by: number) => {
      const to = addMonths({ year, month }, by);
      haptics.selection();
      if (swap.current) clearTimeout(swap.current);
      if (reduced) {
        showCalendarMonth(to.year, to.month);
        return;
      }
      opacity.set(withTiming(0, FADE_OUT));
      swap.current = setTimeout(() => showCalendarMonth(to.year, to.month), FADE_OUT.duration);
    },
    [month, opacity, reduced, year],
  );

  const onDay = useCallback((date: ISODate) => {
    haptics.selection();
    openDay(date);
  }, []);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.root} testID="calendar-month-screen">
      <View style={styles.content}>
        <CalendarHeader title={String(year)} backLabel={`Back to ${year}`} onBack={() => goBack()} />

        <View style={styles.stepper}>
          <FlatKey
            icon="chevron-left"
            label="Previous month"
            onPress={() => step(-1)}
            testID="calendar-prev"
          />
          <View style={styles.title}>
            <Text variant="title" weight="bold" style={styles.monthName} accessibilityRole="header">
              {monthLong(month)}
            </Text>
            <Text variant="footnote" tone="secondary">
              {totals ? countsLabel(totals.workouts, totals.noDetails) : ' '}
            </Text>
          </View>
          <FlatKey
            icon="chevron-right"
            label="Next month"
            onPress={() => step(1)}
            disabled={nextIsFuture}
            testID="calendar-next"
          />
        </View>

        {status === 'error' ? (
          <ErrorState title={`Couldn't load ${monthLong(month)}`} onRetry={retry} />
        ) : (
          <FlatCard style={styles.card}>
            <View style={styles.letters}>
              {LETTERS.map((letter, index) => (
                <Text
                  key={index}
                  variant="mini"
                  weight="semibold"
                  tone="tertiary"
                  align="center"
                  style={styles.letter}
                >
                  {letter}
                </Text>
              ))}
            </View>
            <Animated.View style={fade}>
              <DayGrid weeks={weeks} today={today} selected={selected} onDay={onDay} />
            </Animated.View>
          </FlatCard>
        )}

        <CalendarHint>Tap a past day to open it, or to log it.</CalendarHint>
      </View>
    </SafeAreaView>
  );
}

interface DayGridProps {
  weeks: readonly (readonly (DayTile | null)[])[];
  today: ISODate;
  selected: ISODate | null;
  onDay: (date: ISODate) => void;
}

function spotOf(weeks: DayGridProps['weeks'], date: ISODate | null): Spot | null {
  if (!date) return null;
  for (let row = 0; row < weeks.length; row += 1) {
    const column = weeks[row]?.findIndex((tile) => tile?.date === date) ?? -1;
    if (column >= 0) return { row, column };
  }
  return null;
}

/** The month's weeks, and the rings laid over them: moved to a cell, never drawn by the cells. */
const DayGrid = memo(function DayGrid({ weeks, today, selected, onDay }: DayGridProps) {
  const { theme } = useUnistyles();
  const [width, setWidth] = useState(0);
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);
  const cellWidth = width > 0 ? (width - GAP * 6) / 7 : 0;
  const selectedAt = spotOf(weeks, selected);
  // The open day's ring wins over today's on the same cell.
  const todayAt = selected === today ? null : spotOf(weeks, today);

  const ring = (at: Spot | null, color: string, testID: string) =>
    at && cellWidth > 0 ? (
      <View
        pointerEvents="none"
        testID={testID}
        style={[
          styles.ring,
          {
            left: at.column * (cellWidth + GAP) - RING_OUT,
            top: at.row * (CELL_HEIGHT + GAP) - RING_OUT,
            width: cellWidth + RING_OUT * 2,
            borderColor: color,
          },
        ]}
      />
    ) : null;

  return (
    <View style={styles.weeks} onLayout={onLayout}>
      {weeks.map((week, row) => (
        <View key={row} style={styles.week}>
          {week.map((tile, column) =>
            tile ? (
              <DayCell key={tile.date} tile={tile} onDay={onDay} />
            ) : (
              <View key={`blank-${column}`} style={styles.blank} />
            ),
          )}
        </View>
      ))}
      {ring(todayAt, theme.colors.text, 'calendar-ring-today')}
      {ring(selectedAt, theme.colors.accentText, 'calendar-ring-selected')}
    </View>
  );
});

const DayCell = memo(function DayCell({ tile, onDay }: { tile: DayTile; onDay: (date: ISODate) => void }) {
  const level: Level = tile.look === NO_DETAILS ? 0 : tile.look;
  const name = `${tile.day}${tile.today ? ', today' : ''}`;
  const content = (
    <>
      <Text variant="body" weight="semibold" style={styles.number(level)}>
        {String(tile.day)}
      </Text>
      {tile.look === NO_DETAILS && <View style={styles.dot} />}
    </>
  );
  if (tile.future) {
    return (
      <View
        style={[styles.cell(level, true), styles.future]}
        accessible
        accessibilityLabel={`${name}, still to come`}
      >
        {content}
      </View>
    );
  }
  return (
    <PressableScale
      {...FLAT_PRESS}
      onPress={() => onDay(tile.date)}
      accessibilityRole="button"
      accessibilityLabel={`${name}: ${lookName(tile.look)}`}
      style={styles.cell(level, false)}
      testID={`calendar-day-${tile.date}`}
    >
      {content}
    </PressableScale>
  );
});

const styles = StyleSheet.create((theme) => ({
  root: { flex: 1 },
  content: { flex: 1, paddingHorizontal: theme.spacing.gutter, gap: theme.spacing.lg },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  title: { flex: 1, alignItems: 'center' },
  monthName: { fontSize: 24, lineHeight: 29 },
  card: { borderRadius: 20, paddingVertical: 12, paddingHorizontal: 10, gap: theme.spacing.sm },
  letters: { flexDirection: 'row', gap: GAP },
  letter: { flex: 1 },
  weeks: { gap: GAP },
  week: { flexDirection: 'row', gap: GAP },
  blank: { flex: 1, height: CELL_HEIGHT },
  cell: (level: Level, future: boolean) => ({
    flex: 1,
    height: CELL_HEIGHT,
    borderRadius: RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: future ? 'transparent' : theme.heat[level],
    borderWidth: level === 0 ? 1 : 0,
    borderColor: theme.colors.border,
  }),
  future: { opacity: 0.45 },
  number: (level: Level) => ({ fontSize: 15, color: theme.heatInk[level] }),
  dot: {
    position: 'absolute',
    bottom: 6,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: theme.colors.accentText,
  },
  ring: {
    position: 'absolute',
    height: CELL_HEIGHT + RING_OUT * 2,
    borderRadius: RADIUS + RING_OUT,
    borderWidth: RING_WIDTH,
  },
}));
