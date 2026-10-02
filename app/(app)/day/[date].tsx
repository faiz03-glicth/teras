import { useLocalSearchParams } from 'expo-router';

import { DaySheet } from '@/features/heatmap/ui/DaySheet';
import { parseISODate } from '@/shared/actions/params';

/** Form sheet: one day of the wave — its level, what it was judged against, and its workouts. */
export default function DayRoute() {
  const { date } = useLocalSearchParams<{ date: string }>();
  return <DaySheet date={parseISODate(date)} />;
}
