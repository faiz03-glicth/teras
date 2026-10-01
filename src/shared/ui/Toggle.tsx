import { Switch } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';

export interface ToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
  testID?: string;
}

/** The native switch, tinted with the accent colour. */
export function Toggle({ value, onChange, accessibilityLabel, disabled = false, testID }: ToggleProps) {
  const { theme } = useUnistyles();
  return (
    <Switch
      testID={testID}
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      trackColor={{ false: theme.colors.border2, true: theme.colors.accentText }}
      ios_backgroundColor={theme.colors.border2}
      thumbColor={theme.colors.thumb}
    />
  );
}
