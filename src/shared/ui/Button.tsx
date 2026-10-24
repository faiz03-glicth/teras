import { useState } from 'react';
import { ActivityIndicator, type LayoutChangeEvent } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useStateTransition, type Theme } from '@/theme';

import { ContentSwap } from './ContentSwap';
import { Icon } from './Icon';
import type { IconName } from './icons';
import { PressableScale } from './PressableScale';
import { ctaMotifFits, SongketCta } from './SongketCta';
import { Text } from './Text';

const ICON_SIZE = 18;
/** The icon and the gap between it and the label, which the centred content also takes. */
const ICON_AND_GAP = ICON_SIZE + 8;

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'quiet' | 'danger';
export type ButtonSize = 'xl' | 'lg' | 'md' | 'sm';

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

/**
 * `lg` stands level with the sign-in provider buttons, so a Button can share their stack. `xl` is the one
 * action that ends a screen (Finish workout): a full-width key, 56 tall.
 */
const HEIGHT: Record<ButtonSize, number> = { xl: 56, lg: 52, md: 50, sm: 36 };
/** Extends a small key to a 48dp touch target. */
const SMALL_HIT_SLOP = (48 - HEIGHT.sm) / 2;

const foreground = (theme: Theme, variant: ButtonVariant): string =>
  ({
    primary: theme.colors.onAccent,
    secondary: theme.colors.text,
    ghost: theme.colors.accentText,
    quiet: theme.colors.text2,
    danger: theme.colors.danger,
  })[variant];

/**
 * Every button is a key raised out of the material, and every key shares one behaviour: the press preset,
 * a dimmed disabled state that eases in and out, and a content cross-fade when the label or the loading
 * state changes (the button itself never moves or resizes). Ghost and quiet keys sit lower than the
 * action and say how much they matter through their label: gold, or muted.
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
  const fade = useStateTransition('opacity');
  const shownLabel = loading ? (loadingLabel ?? label) : label;

  // Black presses songket thread into the big gold calls to action. Only those pay for measuring.
  const carriesMotif = variant === 'primary' && size === 'md' && theme.scheme === 'dark';
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [labelWidth, setLabelWidth] = useState(0);
  const showMotif =
    carriesMotif && ctaMotifFits(box.width, box.height, labelWidth + (icon || loading ? ICON_AND_GAP : 0));
  const measureBox = ({ nativeEvent: { layout } }: LayoutChangeEvent) =>
    setBox((prev) =>
      prev.width === layout.width && prev.height === layout.height
        ? prev
        : { width: layout.width, height: layout.height },
    );
  const measureLabel = ({ nativeEvent: { layout } }: LayoutChangeEvent) =>
    setLabelWidth((prev) => (prev === layout.width ? prev : layout.width));

  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      onLayout={carriesMotif ? measureBox : undefined}
      disabled={inactive}
      hitSlop={size === 'sm' ? SMALL_HIT_SLOP : undefined}
      accessibilityRole="button"
      accessibilityLabel={loading ? shownLabel : (accessibilityLabel ?? label)}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={[styles.base(size), { opacity: disabled && !loading ? 0.45 : 1 }, fade]}
      surface={{
        style: styles.surface(variant),
        pressed: styles.pressed(variant),
        bleed: variant === 'primary' || variant === 'secondary' ? 'card' : 'key',
      }}
    >
      {showMotif && <SongketCta />}
      <ContentSwap id={loading ? `busy:${shownLabel}` : label} style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={color} />
        ) : (
          icon && <Icon name={icon} size={ICON_SIZE} color={color} />
        )}
        <Text
          variant={size === 'sm' ? 'sub' : 'headline'}
          weight="semibold"
          style={{ color }}
          numberOfLines={1}
          onLayout={carriesMotif ? measureLabel : undefined}
        >
          {shownLabel}
        </Text>
      </ContentSwap>
    </PressableScale>
  );
}

const styles = StyleSheet.create((theme) => ({
  base: (size: ButtonSize) => ({
    height: HEIGHT[size],
    paddingHorizontal: size === 'sm' ? theme.spacing.md + 2 : theme.spacing.lg,
    alignSelf: size === 'sm' ? ('flex-start' as const) : ('stretch' as const),
    // A key on a console, not a pill: controlled corners read as a physical object.
    borderRadius: theme.radii.control,
    justifyContent: 'center' as const,
  }),
  /** The key's material, drawn once into a texture behind its label (PressableScale's `surface`). */
  surface: (variant: ButtonVariant) => ({
    borderRadius: theme.radii.control,
    backgroundColor: {
      primary: theme.material.accent.background,
      secondary: theme.material.raised.background,
      ghost: theme.material.raisedSm.background,
      quiet: theme.material.raisedSm.background,
      danger: theme.colors.dangerSoft,
    }[variant],
    // Raised out of the material; the lesser keys take the shallower lift, so they never compete with the
    // action.
    boxShadow: {
      primary: theme.material.accent.shadow,
      secondary: theme.material.raised.shadow,
      ghost: theme.material.raisedSm.shadow,
      quiet: theme.material.raisedSm.shadow,
      danger: theme.material.raisedSm.shadow,
    }[variant],
    // The gold keeps its dark edge only where the material says gold alone would not separate.
    borderWidth: variant === 'primary' && theme.material.accent.edge ? 1 : 0,
    borderColor: theme.material.accent.edge ?? 'transparent',
  }),
  /** Under a finger: the lift gives way to a shallow press (the gold sinks with its own warm shade). */
  pressed: (variant: ButtonVariant) => ({
    boxShadow: variant === 'primary' ? theme.material.accent.pressedShadow : theme.material.pressed.shadow,
  }),
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm },
}));
