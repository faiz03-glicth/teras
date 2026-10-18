import { memo } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { monthLong } from '@/shared/lib/date/calendar';
import type { ISODate } from '@/shared/lib/date/isoDate';
import { PressableScale, Text } from '@/shared/ui';

import { monthCountLabel, MONTH_GEOMETRY, totalsOf, type YearDays } from '../../domain/yearCalendar';
import { FLAT_PRESS } from './CalendarParts';
import { useMonthGrid } from '../../hooks/useYearCalendar';
import { HeatPaths } from './HeatPaths';

export interface MonthCardProps {
  days: YearDays;
  /** Zero-based. */
  month: number;
  today: ISODate;
  /** The year has slid in. Until then the picture keeps its room and is drawn after the slide. */
  settled: boolean;
  onOpen: (month: number) => void;
}

/**
 * One month at Level 2: its name, its count and its days as one small picture. The card is the only target;
 * a month still to come is not one at all.
 */
export const MonthCard = memo(function MonthCard({ days, month, today, settled, onOpen }: MonthCardProps) {
  const paths = useMonthGrid(days.year, month, days.looks, today);
  const thisMonth = `${days.year}-${String(month + 1).padStart(2, '0')}`;
  const current = today.startsWith(thisMonth);
  const future = thisMonth > today.slice(0, 7);
  const totals = totalsOf(days, month);
  const count = monthCountLabel(totals.workouts, totals.noDetails, future);
  const name = monthLong(month);

  const body = (
    <>
      <Text variant="sub" weight="bold">
        {name}
      </Text>
      <Text variant="mini" tone="secondary" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {count}
      </Text>
      <View style={styles.grid}>
        <HeatPaths paths={paths} geometry={MONTH_GEOMETRY} todayStroke={1.5} held={!settled} />
      </View>
    </>
  );

  if (future) {
    return (
      <View
        style={[styles.card, styles.future]}
        accessible
        accessibilityLabel={`${name}, not yet`}
        testID={`calendar-month-${month + 1}`}
      >
        {body}
      </View>
    );
  }
  return (
    <PressableScale
      {...FLAT_PRESS}
      onPress={() => onOpen(month)}
      accessibilityRole="button"
      accessibilityLabel={`${name}${current ? ', this month' : ''}, ${count}`}
      accessibilityHint="Opens its days"
      style={[styles.card, current && styles.current]}
      testID={`calendar-month-${month + 1}`}
    >
      {body}
    </PressableScale>
  );
});

const styles = StyleSheet.create((theme) => ({
  card: {
    flex: 1,
    padding: 10,
    borderRadius: 16,
    gap: 2,
    backgroundColor: theme.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  current: { outlineWidth: 1.5, outlineColor: theme.colors.text, outlineOffset: 2, outlineStyle: 'solid' },
  future: { opacity: 0.5 },
  grid: { marginTop: 6 },
}));
