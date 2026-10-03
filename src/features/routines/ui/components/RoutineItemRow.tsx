import { memo } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { IconButton, Text } from '@/shared/ui';

import type { RoutineRowModel } from '../useEditRoutineViewModel';

export interface RoutineItemRowProps {
  row: RoutineRowModel;
  onMove: (key: string, direction: -1 | 1) => void;
  onRemove: (key: string) => void;
}

/** One exercise of a routine being edited: what it asks for, then move up, move down and remove. */
export const RoutineItemRow = memo(function RoutineItemRow({ row, onMove, onRemove }: RoutineItemRowProps) {
  return (
    <View style={styles.row} testID={`routine-item-${row.key}`}>
      <View style={styles.text}>
        <Text variant="sub" weight="semibold" testID={`routine-item-name-${row.key}`}>
          {row.name}
        </Text>
        <Text variant="footnote" tone="secondary">
          {row.line}
        </Text>
      </View>
      <IconButton
        icon="chevron-up"
        plain
        disabled={!row.canMoveUp}
        onPress={() => onMove(row.key, -1)}
        accessibilityLabel={`Move ${row.name} up`}
      />
      <IconButton
        icon="chevron-down"
        plain
        disabled={!row.canMoveDown}
        onPress={() => onMove(row.key, 1)}
        accessibilityLabel={`Move ${row.name} down`}
      />
      <IconButton
        icon="close"
        plain
        onPress={() => onRemove(row.key)}
        accessibilityLabel={`Remove ${row.name}`}
      />
    </View>
  );
});

const styles = StyleSheet.create((theme) => ({
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  text: { flex: 1, gap: 1, paddingVertical: theme.spacing.sm },
}));
