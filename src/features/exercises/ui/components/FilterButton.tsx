import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Icon, PressableScale, Text } from '@/shared/ui';

export interface FilterButtonProps {
  label: string;
  /** A filter is on: the button sits pressed into the material, ticked. */
  active: boolean;
  /** For a filter that opens in place rather than as a sheet (the muscles): whether it is open. */
  expanded?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  testID?: string;
}

/**
 * One of the browser's filters ("All equipment ▾"), opening its sheet, or the muscle filter in place
 * (its chevron then points up while open). Shares its row with the other.
 */
export function FilterButton({
  label,
  active,
  expanded,
  onPress,
  accessibilityLabel,
  testID,
}: FilterButtonProps) {
  const { theme } = useUnistyles();
  const color = active ? theme.colors.accentText : theme.colors.text;
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={expanded === undefined ? undefined : { expanded }}
      testID={testID}
      style={[styles.button, active ? styles.active : styles.idle]}
      pressedStyle={styles.pressed}
    >
      {active && <Icon name="check" size={14} color={color} />}
      <Text variant="sub" weight="semibold" numberOfLines={1} style={[styles.label, { color }]}>
        {label}
      </Text>
      <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={theme.colors.text2} />
    </PressableScale>
  );
}

const styles = StyleSheet.create((theme) => ({
  button: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.control,
  },
  idle: { backgroundColor: theme.material.raised.background, boxShadow: theme.material.raisedSm.shadow },
  // Selected states are pressed in, a darker fill as well as the inner shadow.
  active: { backgroundColor: theme.material.inset.background, boxShadow: theme.material.inset.shadow },
  pressed: { boxShadow: theme.material.pressed.shadow },
  label: { flexShrink: 1 },
}));
