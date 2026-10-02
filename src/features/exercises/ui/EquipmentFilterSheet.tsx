import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Card, Icon, PressableScale, SheetLayout, Text } from '@/shared/ui';

import { useEquipmentFilterViewModel } from './useEquipmentFilterViewModel';

/** Form sheet over the exercise browser: narrow it to one kind of equipment, or all of them. */
export function EquipmentFilterSheet() {
  const vm = useEquipmentFilterViewModel();

  return (
    <SheetLayout title="Equipment" onClose={vm.onClose} testID="equipment-filter-sheet">
      <View accessibilityRole="radiogroup" accessibilityLabel="Equipment">
        <Card tight divided>
          {vm.options.map((option) => (
            <Option
              key={option.value}
              label={option.label}
              selected={option.selected}
              onPress={() => vm.onPick(option.value)}
              testID={`equipment-filter-${option.value}`}
            />
          ))}
        </Card>
      </View>
    </SheetLayout>
  );
}

interface OptionProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID: string;
}

function Option({ label, selected, onPress, testID }: OptionProps) {
  const { theme } = useUnistyles();
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.985}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      style={styles.option}
      testID={testID}
    >
      <Text variant="body" weight={selected ? 'semibold' : 'regular'} style={styles.label}>
        {label}
      </Text>
      {selected && <Icon name="check" size={18} color={theme.colors.accentText} />}
    </PressableScale>
  );
}

const styles = StyleSheet.create((theme) => ({
  option: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  label: { flex: 1 },
}));
