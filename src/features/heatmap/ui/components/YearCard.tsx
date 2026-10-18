import { memo, useMemo } from 'react';
import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useWorkoutOwner } from '@/features/workouts/hooks/useWorkoutQueries';
import type { ISODate } from '@/shared/lib/date/isoDate';
import { Icon, PressableScale, Text } from '@/shared/ui';

import { countsLabel, monthMarks, STRIP_GEOMETRY, totalsOf, type DayLook } from '../../domain/yearCalendar';
import { useYearDays, useYearStrip } from '../../hooks/useYearCalendar';
import { FLAT_PRESS } from './CalendarParts';
import { HeatPaths } from './HeatPaths';

/** The weekday column beside the strip, and the gap after it: month marks start this far in. */
const WEEKDAY_COLUMN = 10;
const WEEKDAY_GAP = 3;
export const STRIP_INSET = WEEKDAY_COLUMN + WEEKDAY_GAP;
/** Monday, Wednesday, Friday and Sunday are named; the rows between them are not. */
const WEEKDAY_ROWS = [
  { row: 0, letter: 'M' },
  { row: 2, letter: 'W' },
  { row: 4, letter: 'F' },
  { row: 6, letter: 'S' },
] as const;
const NOTHING = new Map<ISODate, DayLook>();
/** About the width of a three-letter month at 9 pt: a mark closer than this to the last one is left out. */
const MARK_WIDTH = 22;

export interface YearCardProps {
  year: number;
  today: ISODate;
  /** The most the strip may be drawn across (the card's inner width less the weekday column). */
  stripWidth: number;
  /** The Calendar has slid in. Until then the strip keeps its room and is drawn after the slide. */
  settled: boolean;
  onPress: (year: number) => void;
}

/**
 * One year at Level 1: its name and counts, the month marks, and the whole year as one strip. The whole card
 * is the button; no day in it is. It reads its own year's days, so a card loads only once it scrolls in.
 */
export const YearCard = memo(function YearCard({ year, today, stripWidth, settled, onPress }: YearCardProps) {
  const { theme } = useUnistyles();
  const { data } = useYearDays(useWorkoutOwner(), year);
  const looks = data?.looks ?? NOTHING;
  const paths = useYearStrip(year, looks, today);
  const marks = useMemo(() => monthMarks(year), [year]);

  const drawn = Math.min(paths.width, stripWidth);
  const scale = paths.width > 0 ? drawn / paths.width : 1;
  const step = (STRIP_GEOMETRY.cell + STRIP_GEOMETRY.gap) * scale;
  // Months four weeks apart at a narrow scale would run into each other: keep the first of each crowded run.
  const shown = marks.reduce<{ month: number; label: string; left: number }[]>((kept, mark) => {
    const left = STRIP_INSET + mark.column * step;
    const last = kept.at(-1);
    return last && left - last.left < MARK_WIDTH ? kept : [...kept, { ...mark, left }];
  }, []);
  const totals = data ? totalsOf(data) : null;
  const sub = totals ? countsLabel(totals.workouts, totals.noDetails) : '';
  const isThisYear = year === Number(today.slice(0, 4));

  return (
    <PressableScale
      {...FLAT_PRESS}
      onPress={() => onPress(year)}
      accessibilityRole="button"
      accessibilityLabel={`${year}${isThisYear ? ', this year' : ''}${sub ? `, ${sub}` : ''}`}
      accessibilityHint="Opens its months"
      style={styles.card}
      testID={`calendar-year-${year}`}
    >
      <View style={styles.head}>
        <Text variant="headline" weight="bold" style={styles.year}>
          {String(year)}
        </Text>
        {isThisYear && (
          <View style={styles.pill}>
            <Text variant="mini" weight="bold" style={styles.pillText}>
              This year
            </Text>
          </View>
        )}
        <Text
          variant="caption"
          tone="secondary"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          style={styles.sub}
        >
          {sub}
        </Text>
        <Icon name="chevron-right" size={16} color={theme.colors.text3} />
      </View>

      <View style={styles.marks}>
        {shown.map((mark) => (
          <Text key={mark.month} weight="semibold" style={[styles.mark, { left: mark.left }]}>
            {mark.label}
          </Text>
        ))}
      </View>

      <View style={styles.strip}>
        <View style={[styles.weekdays, { height: paths.height * scale }]}>
          {WEEKDAY_ROWS.map(({ row, letter }) => (
            <Text key={row} weight="semibold" style={[styles.weekday, { top: row * step - 1 }]}>
              {letter}
            </Text>
          ))}
        </View>
        <HeatPaths paths={paths} geometry={STRIP_GEOMETRY} width={drawn} held={!settled} />
      </View>
    </PressableScale>
  );
});

const styles = StyleSheet.create((theme) => ({
  card: {
    paddingVertical: 14,
    paddingHorizontal: 13,
    borderRadius: 20,
    gap: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  year: { fontSize: 17, lineHeight: 22 },
  pill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: theme.colors.accentSoft,
  },
  pillText: { fontSize: 11, lineHeight: 14, color: theme.colors.accentText },
  sub: { flex: 1, textAlign: 'right' },
  marks: { height: 11 },
  mark: {
    position: 'absolute',
    top: 0,
    fontSize: 9,
    lineHeight: 11,
    color: theme.colors.text3,
  },
  strip: { flexDirection: 'row', gap: WEEKDAY_GAP },
  weekdays: { width: WEEKDAY_COLUMN },
  weekday: {
    position: 'absolute',
    left: 0,
    fontSize: 7,
    lineHeight: 8,
    color: theme.colors.text3,
  },
}));
