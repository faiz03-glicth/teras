import { useCallback, useMemo, useState } from 'react';

import { EMPTY_WEEK, weekSummary, type GroupTiers } from '@/features/muscles/domain/muscleCards';
import { MUSCLE_GROUPS } from '@/features/muscles/domain/muscleGroups';
import { weekOf } from '@/features/muscles/domain/muscleStats';
import { useMuscleWindow, type MuscleStatus } from '@/features/muscles/hooks/useMuscleWindow';
import type { ISODate } from '@/shared/lib/date/isoDate';

export interface MusclesThisWeekModel {
  status: MuscleStatus;
  /** Each group's look on the map: not hit, once, twice. Every group not hit while loading. */
  tiers: GroupTiers;
  /** "3 of 10 muscles hit twice", or why there is no count. */
  line: string;
  /** Every muscle twice and the person has not closed the banner for this week. */
  showBanner: boolean;
  accessibilityLabel: string;
  onDismissBanner: () => void;
}

/**
 * Home's "Muscles this week": the tier of each muscle group from Monday to today, how many reached the goal,
 * and whether the "Keep this up" banner shows. Closing the banner hides it for this week only: next Monday a
 * new week that gets there shows it again.
 */
export function useMusclesThisWeek(): MusclesThisWeekModel {
  const { today, rows, status } = useMuscleWindow();
  const monday = weekOf(today);
  const [dismissedWeek, setDismissedWeek] = useState<ISODate | null>(null);
  const week = useMemo(
    () => (status === 'ready' ? weekSummary(rows, monday) : EMPTY_WEEK),
    [status, rows, monday],
  );
  const onDismissBanner = useCallback(() => setDismissedWeek(monday), [monday]);

  return {
    status,
    tiers: week.tiers,
    line: LINES[status](week.twice),
    showBanner: status === 'ready' && week.allTwice && dismissedWeek !== monday,
    accessibilityLabel:
      status === 'ready' ? week.accessibilityLabel : `Muscles this week, ${STATUS_WORDS[status]}.`,
    onDismissBanner,
  };
}

const LINES: Record<MuscleStatus, (twice: number) => string> = {
  loading: () => 'Loading…',
  error: () => "Couldn't load this week",
  ready: (twice) => `${twice} of ${MUSCLE_GROUPS.length} muscles hit twice`,
};

const STATUS_WORDS = { loading: 'loading', error: 'could not be loaded' } as const;
