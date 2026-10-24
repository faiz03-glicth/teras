import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Icon, Text } from '@/shared/ui';

export interface SavedChipProps {
  /** The workout is being written to the phone's database right now (finishing): "Saving…". */
  saving?: boolean;
}

/**
 * Says, quietly, that the workout is safe: every set is written to the phone the moment it is ticked, so
 * "Saved on this phone" is true all the while the workout runs. A flat chip (no lift, no shadow): it is a
 * status, not a control. The check is the only colour; the words are the secondary text.
 */
export function SavedChip({ saving = false }: SavedChipProps) {
  const { theme } = useUnistyles();
  return (
    <View
      style={styles.chip}
      accessible
      accessibilityLabel={saving ? 'Saving workout' : 'Workout saved on this phone'}
      testID="saved-chip"
    >
      <Icon name="check" size={12} color={theme.colors.success} />
      <Text variant="caption" tone="secondary" numberOfLines={1} style={styles.label}>
        {saving ? 'Saving…' : 'Saved on this phone'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  chip: {
    flexShrink: 1,
    height: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingLeft: 6,
    paddingRight: 9,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.subtle,
  },
  label: { flexShrink: 1 },
}));
