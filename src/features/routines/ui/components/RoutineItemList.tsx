import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { StyleSheet as RNStyleSheet } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';

import { Card, Text } from '@/shared/ui';

import type { EditRoutineViewModel } from '../useEditRoutineViewModel';

import { RoutineItemRow, type ReorderState } from './RoutineItemRow';

/** Card's divider between rows, counted into each row's height so a dragged row lands on its slot. */
const DIVIDER = RNStyleSheet.hairlineWidth;

type ListProps = Pick<
  EditRoutineViewModel,
  'rows' | 'onMove' | 'onMoveTo' | 'onRemove' | 'onStep' | 'onType'
>;

/**
 * The routine's exercises, in order. One row at a time opens its targets. Holding a row lifts it to be
 * dragged; while it moves, only shared values change (no render), and the routine is reordered once it is
 * let go, after which the rows' offsets are cleared in the same layout pass.
 */
export function RoutineItemList({ rows, onMove, onMoveTo, onRemove, onStep, onType }: ListProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const order = useSharedValue<string[]>([]);
  const heights = useSharedValue<Record<string, number>>({});
  const active = useSharedValue<string | null>(null);
  const from = useSharedValue(0);
  const to = useSharedValue(0);
  const dragY = useSharedValue(0);
  const drag = useMemo<ReorderState>(
    () => ({ order, heights, active, from, to, dragY }),
    [active, dragY, from, heights, order, to],
  );

  const keys = useMemo(() => rows.map((row) => row.key), [rows]);
  // A new order (a drop, an add, a removal): the rows now sit where they were dragged to, so the drag's
  // offsets go back to nothing before this layout is painted.
  useLayoutEffect(() => {
    order.set(keys);
    active.set(null);
    dragY.set(0);
  }, [active, dragY, keys, order]);

  const onToggle = useCallback((key: string) => setExpanded((open) => (open === key ? null : key)), []);

  const onDrop = useCallback(
    (key: string, start: number, place: number) => {
      if (place === start) {
        // Back where it was: nothing to reorder, so the offsets clear here.
        active.set(null);
        dragY.set(0);
        return;
      }
      onMoveTo(key, place);
    },
    [active, dragY, onMoveTo],
  );

  if (rows.length === 0) {
    return (
      <Card tight divided>
        <Text variant="footnote" tone="secondary" style={styles.empty}>
          No exercises yet
        </Text>
      </Card>
    );
  }

  return (
    <Card tight divided>
      {rows.map((row) => (
        <RoutineItemRow
          key={row.key}
          row={row}
          expanded={expanded === row.key}
          drag={drag}
          divider={DIVIDER}
          onToggle={onToggle}
          onMove={onMove}
          onDrop={onDrop}
          onRemove={onRemove}
          onStep={onStep}
          onType={onType}
        />
      ))}
    </Card>
  );
}

const styles = StyleSheet.create((theme) => ({
  empty: { paddingVertical: theme.spacing.lg, textAlign: 'center' },
}));
