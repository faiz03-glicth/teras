import type { ReactNode } from 'react';
import Animated from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useSelectionMotion, useStateTransition } from '@/theme';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface SelectableTileProps {
  label: string;
  icon: ReactNode;
  selected: boolean;
  /** The selected tile's border (e.g. the activity's colour). */
  accentColor: string;
  onPress: () => void;
  /** checkbox for multi-select grids, radio for single-select. */
  accessibilityRole: 'checkbox' | 'radio';
  testID?: string;
}

/**
 * A tile that can be chosen. Owns its whole selection behaviour, so every grid of choices responds alike:
 * the press, the selected surface and border (applied at once, easing between states), and the icon's
 * selection response (swell when chosen, dip when released) from the motion system.
 */
export function SelectableTile({
  label,
  icon,
  selected,
  accentColor,
  onPress,
  accessibilityRole,
  testID,
}: SelectableTileProps) {
  const { theme } = useUnistyles();
  const surface = useStateTransition(['backgroundColor', 'borderColor'], 'normal');
  const response = useSelectionMotion(selected);

  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={label}
      accessibilityState={accessibilityRole === 'checkbox' ? { checked: selected } : { selected }}
      style={[
        styles.tile,
        // Colours are set inline so selection can ease between them.
        {
          borderColor: selected ? accentColor : theme.colors.subtle,
          backgroundColor: selected ? (theme.glass?.strong ?? theme.colors.surface) : theme.colors.subtle,
        },
        surface,
      ]}
    >
      <Animated.View style={response}>{icon}</Animated.View>
      <Text variant="footnote" weight="medium" numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create((theme) => ({
  tile: {
    flex: 1,
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: 16,
    borderWidth: 1.5,
  },
}));
