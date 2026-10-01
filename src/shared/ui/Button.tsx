import { ActivityIndicator } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useStateTransition, type Theme } from '@/theme';

import { ContentSwap } from './ContentSwap';
import { Icon } from './Icon';
import type { IconName } from './icons';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'quiet' | 'danger';
export type ButtonSize = 'md' | 'sm';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  loading?: boolean;
  loadingLabel?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

const foreground = (theme: Theme, variant: ButtonVariant): string =>
  ({
    primary: theme.colors.onAccent,
    secondary: theme.colors.text,
    ghost: theme.colors.accentText,
    quiet: theme.colors.text2,
    danger: theme.colors.danger,
  })[variant];

/**
 * Every button shares one behaviour: the press preset, a dimmed disabled state that eases in and out, and
 * a content cross-fade when the label or the loading state changes (the button itself never moves or
 * resizes). Text-only variants (ghost, quiet) are 40pt tall with hit slop so the touch target still
 * reaches 44pt.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  loadingLabel,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const { theme } = useUnistyles();
  const color = foreground(theme, variant);
  const inactive = disabled || loading;
  const textOnly = variant === 'ghost' || variant === 'quiet';
  const fade = useStateTransition('opacity');
  const shownLabel = loading ? (loadingLabel ?? label) : label;

  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      disabled={inactive}
      hitSlop={textOnly ? 2 : undefined}
      accessibilityRole="button"
      accessibilityLabel={loading ? shownLabel : (accessibilityLabel ?? label)}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={[styles.base(variant, size), { opacity: disabled && !loading ? 0.45 : 1 }, fade]}
    >
      <ContentSwap id={loading ? `busy:${shownLabel}` : label} style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={color} />
        ) : (
          icon && <Icon name={icon} size={18} color={color} />
        )}
        <Text
          variant={size === 'sm' ? 'sub' : 'headline'}
          weight="semibold"
          style={{ color }}
          numberOfLines={1}
        >
          {shownLabel}
        </Text>
      </ContentSwap>
    </PressableScale>
  );
}

const styles = StyleSheet.create((theme) => ({
  base: (variant: ButtonVariant, size: ButtonSize) => ({
    height: size === 'sm' ? 36 : variant === 'ghost' || variant === 'quiet' ? 40 : 50,
    minHeight: size === 'sm' ? 36 : 40,
    paddingHorizontal: size === 'sm' ? theme.spacing.md + 2 : theme.spacing.lg,
    alignSelf: size === 'sm' ? ('flex-start' as const) : ('stretch' as const),
    borderRadius: theme.radii.pill,
    justifyContent: 'center' as const,
    backgroundColor: {
      primary: theme.colors.accent,
      secondary: theme.glass ? theme.glass.strong : theme.colors.subtle,
      ghost: 'transparent',
      quiet: 'transparent',
      danger: theme.colors.dangerSoft,
    }[variant],
    // The gold fill always carries its dark outline (see tokens/brand.ts).
    borderWidth: variant === 'primary' ? 1.5 : 0,
    borderColor: theme.colors.accentEdge,
  }),
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm },
}));
