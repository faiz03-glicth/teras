import { forwardRef, useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import Animated from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useStateTransition } from '@/theme';

import { Icon } from './Icon';
import type { IconName } from './icons';
import { Text } from './Text';

export interface TextFieldProps extends Omit<TextInputProps, 'style' | 'placeholderTextColor'> {
  /** Spoken name of the field (placeholders are not labels). */
  label: string;
  icon?: IconName;
  error?: string | null;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, icon, error, onFocus, onBlur, ...inputProps },
  ref,
) {
  const { theme } = useUnistyles();
  const [focused, setFocused] = useState(false);
  const outline = useStateTransition('borderColor');
  // A visible outline at rest (3:1) says "you can type here"; focus and errors take over smoothly.
  const borderColor = error ? theme.colors.danger : focused ? theme.colors.accentText : theme.colors.border2;

  return (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.field, { borderColor }, outline]}>
        {icon && <Icon name={icon} size={18} color={theme.colors.text3} />}
        <TextInput
          ref={ref}
          {...inputProps}
          accessibilityLabel={label}
          accessibilityHint={error ?? inputProps.accessibilityHint}
          placeholderTextColor={theme.colors.text3}
          selectionColor={theme.colors.accentText}
          keyboardAppearance={theme.scheme}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={styles.input}
        />
      </Animated.View>
      {error ? (
        <Text variant="footnote" tone="danger" accessibilityLiveRegion="polite" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create((theme) => ({
  wrapper: { gap: theme.spacing.xs + 2 },
  field: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: theme.radii.control,
    borderWidth: 1.5,
    backgroundColor: theme.colors.subtle,
  },
  input: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular,
    fontSize: 15,
  },
}));
