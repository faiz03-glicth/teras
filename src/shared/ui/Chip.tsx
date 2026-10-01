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
 * Pill-shaped choices, one selected (History's activity filters, the check-in time). The selected chip
 * inverts (a text-coloured fill); the state changes at once and its colour eases. Tapping the selected
 * chip again does nothing.
 */
export function ChipRow<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  scroll = false,
  testID,
}: ChipRowProps<T>) {
  const chips = options.map((option) => (
    <Chip
      key={option.value}
      label={option.label}
      selected={option.value === value}
      onPress={() => {
        if (option.value !== value) onChange(option.value);
      }}
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
  label: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}

function Chip({ label, selected, onPress, testID }: ChipProps) {
  const { theme } = useUnistyles();
  const tint = useStateTransition('backgroundColor', 'normal');
  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      hitSlop={4}
      style={[styles.chip, { backgroundColor: selected ? theme.colors.text : theme.colors.subtle }, tint]}
    >
      <Text
        variant="footnote"
        weight="medium"
        style={{ color: selected ? theme.colors.canvas : theme.colors.text2 }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create((theme) => ({
  chip: {
    minHeight: 34,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  // Full-bleed: the row scrolls under the screen's side padding, and lines up with it at rest.
  bleed: { marginHorizontal: -theme.spacing.gutter, flexGrow: 0 },
  scroll: { gap: 6, paddingHorizontal: theme.spacing.gutter },
}));
