import { Redirect, useLocalSearchParams } from 'expo-router';

import { MonthDaysScreen } from '@/features/heatmap/ui/MonthDaysScreen';
import { parseMonth, parseYear } from '@/shared/actions/params';

/** A month's days (the link carries 1–12). A link with no real month goes back to the years. */
export default function CalendarMonthRoute() {
  const params = useLocalSearchParams<{ year: string; month: string }>();
  const year = parseYear(params.year);
  const month = parseMonth(params.month);
  if (year === null || month === null) return <Redirect href="/calendar" />;
  return <MonthDaysScreen year={year} month={month} />;
}
