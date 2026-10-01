import { useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useStateTransition } from '@/theme';

import { Text } from './Text';

export interface OtpInputProps {
  value: string;
  onChangeText: (code: string) => void;
  /** Called once when the last digit is entered. */
  onComplete?: (code: string) => void;
  length?: number;
  error?: string | null;
  disabled?: boolean;
  autoFocus?: boolean;
  accessibilityLabel?: string;
}

/**
 * One real (invisible) TextInput drives the whole code so iOS/Android one-time-code autofill and
 * screen readers work; the digit boxes are purely visual.
 */
export function OtpInput({
  value,
  onChangeText,
  onComplete,
  length = 6,
  error,
  disabled = false,
  autoFocus = false,
  accessibilityLabel = 'Verification code',
}: OtpInputProps) {
  const input = useRef<TextInput>(null);
  const [focused, setFocused] = useState(autoFocus);
  const { theme } = useUnistyles();
  const outline = useStateTransition('borderColor');

  const handleChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, length);
    onChangeText(digits);
    if (digits.length === length && digits !== value) onComplete?.(digits);
  };

  return (
    <View style={styles.wrapper}>
      <Pressable onPress={() => input.current?.focus()} accessible={false} style={styles.boxes}>
        {Array.from({ length }, (_, index) => {
          const active = focused && index === Math.min(value.length, length - 1);
          return (
            <Animated.View
              key={index}
              style={[
                styles.box,
                // Outlined at rest (3:1); the active box and errors take over smoothly as you type.
                {
                  borderColor: error
                    ? theme.colors.danger
                    : active
                      ? theme.colors.accentText
                      : theme.colors.border2,
                },
                outline,
              ]}
              importantForAccessibility="no-hide-descendants"
            >
              <Text variant="title3" style={styles.digit}>
                {value[index] ?? ''}
              </Text>
            </Animated.View>
          );
        })}
        <TextInput
          ref={input}
          testID="otp-input"
          value={value}
          onChangeText={handleChange}
          editable={!disabled}
          autoFocus={autoFocus}
          maxLength={length}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={error ?? `${length} digits`}
          caretHidden
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[StyleSheet.absoluteFill, styles.hiddenInput]}
        />
      </Pressable>
      {error ? (
        <Text variant="footnote" tone="danger" accessibilityRole="alert" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  wrapper: { gap: theme.spacing.sm },
  boxes: { flexDirection: 'row', gap: theme.spacing.sm },
  box: {
    flex: 1,
    height: 54,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.subtle,
    borderWidth: 1.5,
  },
  digit: { fontVariant: ['tabular-nums'] },
  // Nearly transparent (not 0) so the OS still offers code autofill on it.
  hiddenInput: { opacity: 0.02, color: 'transparent' },
}));
