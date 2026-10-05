import { memo } from 'react';
import { ScrollView, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useStateTransition } from '@/theme';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface ChipOption<T extends string> {
  value: T;
  label: string;
}

export interface ChipRowProps<T extends string> {
  options: readonly ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
  /** One row that scrolls sideways under the screen's padding (filters), or a plain row (few choices). */
  scroll?: boolean;
  testID?: string;
}

/**
 * Small keys, one chosen (History's activity filters, the check-in time). The chosen chip is pressed into
 * the surface with a gold label; the state changes at once and its fill eases. Tapping the chosen chip
 * again does nothing.
 */
export function ChipRow<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  scroll = false,
  testID,
}: ChipRowProps<T>) {
  // Each chip is memoised on (label, selected), so a pick re-renders only the two chips that change.
  const chips = options.map((option) => (
    <Chip
      key={option.value}
      value={option.value}
      label={option.label}
      selected={option.value === value}
      onSelect={onChange as (value: string) => void}
      testID={testID && `${testID}-${option.value}`}
    />
  ));
  if (!scroll) {
    return (
      <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
        {chips}
      </View>
    );
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      style={styles.bleed}
      contentContainerStyle={styles.scroll}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
    >
      {chips}
    </ScrollView>
  );
}

interface ChipProps {
  value: string;
  label: string;
  selected: boolean;
  onSelect: (value: string) => void;
  testID?: string;
}

const Chip = memo(function Chip({ value, label, selected, onSelect, testID }: ChipProps) {
  const { theme } = useUnistyles();
  const tint = useStateTransition('backgroundColor', 'normal');
  return (
    <PressableScale
      testID={testID}
      onPress={() => {
        if (!selected) onSelect(value);
      }}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      hitSlop={4}
      style={[styles.chip(selected), tint]}
      pressedStyle={selected ? undefined : styles.pressed}
    >
      <Text
        variant="footnote"
        weight={selected ? 'semibold' : 'medium'}
        style={{ color: selected ? theme.colors.accentText : theme.colors.text }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </PressableScale>
  );
});

/** How far a raised key's shadow reaches past its edge. */
const KEY_SHADOW_ROOM = 10;

const styles = StyleSheet.create((theme) => ({
  // A small key. The chosen one is pressed into the surface: its darker fill and gold label read as
  // chosen even where inset shadows do not draw.
  chip: (selected: boolean) => ({
    minHeight: 34,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.key,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: selected ? theme.material.inset.background : theme.material.raisedSm.background,
    boxShadow: selected ? theme.material.inset.shadow : theme.material.raisedSm.shadow,
  }),
  pressed: { boxShadow: theme.material.pressed.shadow },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  // Full-bleed: the row scrolls under the screen's side padding, and lines up with it at rest. It keeps
  // room above and below, so the scroll view does not cut the keys' shadows off.
  bleed: { marginHorizontal: -theme.spacing.gutter, marginVertical: -KEY_SHADOW_ROOM, flexGrow: 0 },
  scroll: { gap: 6, paddingHorizontal: theme.spacing.gutter, paddingVertical: KEY_SHADOW_ROOM },
}));
