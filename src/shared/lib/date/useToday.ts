import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { toISODate, type ISODate } from './isoDate';

/**
 * Today's local calendar day, kept current: it rolls over at midnight and is re-read whenever the app
 * comes back to the foreground (the phone may have slept through midnight, or changed time zone).
 */
export function useToday(): ISODate {
  const [today, setToday] = useState(() => toISODate(new Date()));

  useEffect(() => {
    const refresh = () => setToday(toISODate(new Date()));
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timer = setTimeout(refresh, midnight.getTime() - now.getTime() + 500);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [today]);

  return today;
}
