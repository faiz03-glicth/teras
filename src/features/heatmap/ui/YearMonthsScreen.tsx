import { useCallback } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-unistyles';

import { useWorkoutOwner } from '@/features/workouts/hooks/useWorkoutQueries';
import { goBack, openCalendarMonth, useScreenSettled } from '@/shared/actions';
import { useToday } from '@/shared/lib/date/useToday';
import { ErrorState, LoadingState, PressDelay } from '@/shared/ui';
import { motion } from '@/theme';

import { countsLabel, totalsOf } from '../domain/yearCalendar';
import { useYearDays } from '../hooks/useYearCalendar';
import { CalendarHeader, CalendarHint, CalendarLegend } from './components/CalendarParts';
import { MonthCard } from './components/MonthCard';

/** The twelve months, three to a row. */
const ROWS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [9, 10, 11],
] as const;

/** Level 2 of the Calendar: a year's twelve months, each a card with its days as one small picture. */
export function YearMonthsScreen({ year }: { year: number }) {
  const owner = useWorkoutOwner();
  const today = useToday();
  const { data, status, retry } = useYearDays(owner, year);
  // The twelve pictures are drawn once the year has slid in, not during the slide.
  const settled = useScreenSettled();
  const onMonth = useCallback((month: number) => openCalendarMonth(year, month), [year]);
  const totals = data ? totalsOf(data) : null;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.root} testID="calendar-year-screen">
      <PressDelay value={motion.scroll.pressDelayMs}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <CalendarHeader
              title={String(year)}
              sub={totals ? countsLabel(totals.workouts, totals.noDetails) : ' '}
              backLabel="Back to your years"
              onBack={() => goBack()}
            />
          </View>

          {status === 'loading' && <LoadingState label={`Loading ${year}`} />}
          {status === 'error' && <ErrorState title={`Couldn't load ${year}`} onRetry={retry} />}
          {data && (
            <View style={styles.grid}>
              {ROWS.map((row) => (
                <View key={row[0]} style={styles.row}>
                  {row.map((month) => (
                    <MonthCard
                      key={month}
                      days={data}
                      month={month}
                      today={today}
                      settled={settled}
                      onOpen={onMonth}
                    />
                  ))}
                </View>
              ))}
            </View>
          )}

          <View style={styles.footer}>
            <CalendarLegend />
            <CalendarHint>Tap a month for its days.</CalendarHint>
          </View>
        </ScrollView>
      </PressDelay>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: { flex: 1 },
  content: { paddingHorizontal: theme.spacing.gutter, paddingBottom: theme.spacing.xxxl * 2 },
  header: { paddingBottom: theme.spacing.lg },
  grid: { gap: 10 },
  row: { flexDirection: 'row', gap: 10 },
  footer: { paddingTop: theme.spacing.xl, gap: theme.spacing.xs },
}));
