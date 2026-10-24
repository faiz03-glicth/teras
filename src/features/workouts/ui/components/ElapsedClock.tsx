import { useCallback } from 'react';
import { StyleSheet } from 'react-native-unistyles';

import { formatDuration } from '@/shared/lib/format/formatDuration';
import { Text } from '@/shared/ui';

import { useClockValue } from '../useClockValue';

/**
 * How long the workout has run, in the header beside "Saved on this phone". The clock lives here, so it
 * redraws this one line once a second and nothing else. A screen reader gets the same time from the stats
 * row below, so this copy is left out of its reading order rather than ticking in its ear.
 */
export function ElapsedClock({ startedAt }: { startedAt: string }) {
  const start = Date.parse(startedAt);
  const elapsed = useClockValue(
    useCallback((now: number) => Math.max(0, Math.floor((now - start) / 1000)), [start]),
  );
  return (
    <Text
      variant="caption"
      tone="secondary"
      accessible={false}
      importantForAccessibility="no"
      style={styles.number}
      testID="elapsed-clock"
    >
      {formatDuration(elapsed)}
    </Text>
  );
}

const styles = StyleSheet.create({
  number: { fontVariant: ['tabular-nums'] },
});
