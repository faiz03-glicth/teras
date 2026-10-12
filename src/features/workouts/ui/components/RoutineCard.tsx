import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { HeatLevel } from '@/features/heatmap/domain/grid';
import { Button, Card, HeatCell, IconButton, ListRow, Text } from '@/shared/ui';

export interface RoutineCardProps {
  id: string;
  name: string;
  /** "5 exercises · Bench Press, Overhead Press, …", cut to one line. */
  line: string;
  /** How the last time went, "Peak · yesterday", with that day's level; null when never done. */
  last: { level: HeatLevel; label: string } | null;
  /** The card's body: the preview (or, for an empty routine, the editor). */
  onOpen: () => void;
  onEdit: () => void;
  onStart: () => void;
}

/**
 * One routine on the Workout tab, a card of its own: its name and exercises open it, and under them how the
 * last time went, Edit, and the gold Start, which goes straight into the workout.
 */
export function RoutineCard({ id, name, line, last, onOpen, onEdit, onStart }: RoutineCardProps) {
  return (
    <Card tight testID={`routine-card-${id}`}>
      <ListRow
        title={name}
        description={line}
        descriptionLines={1}
        trailing="chevron"
        onPress={onOpen}
        accessibilityHint="Shows what to beat from last week"
        testID={`routine-${id}`}
      />
      <View style={styles.foot}>
        <View style={styles.last}>
          {last && <HeatCell level={last.level} size={10} radius={3} />}
          <Text variant="caption" tone="tertiary" numberOfLines={1} style={styles.lastText}>
            {last?.label ?? 'Not done yet'}
          </Text>
        </View>
        <IconButton
          icon="pencil"
          onPress={onEdit}
          accessibilityLabel={`Edit ${name}`}
          testID={`routine-edit-${id}`}
        />
        <Button
          label="Start"
          size="sm"
          onPress={onStart}
          accessibilityLabel={`Start ${name}`}
          testID={`routine-start-${id}`}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create((theme) => ({
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    // The card pads the sides already: this lines up under the name.
    paddingBottom: theme.spacing.md,
  },
  last: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6 },
  lastText: { flexShrink: 1 },
}));
