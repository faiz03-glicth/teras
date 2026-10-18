import { Redirect, useLocalSearchParams } from 'expo-router';

import { YearMonthsScreen } from '@/features/heatmap/ui/YearMonthsScreen';
import { parseYear } from '@/shared/actions/params';

/** A year's twelve months. A link with no real year goes back to the years. */
export default function CalendarYearRoute() {
  const params = useLocalSearchParams<{ year: string }>();
  const year = parseYear(params.year);
  if (year === null) return <Redirect href="/calendar" />;
  return <YearMonthsScreen year={year} />;
}
