import { ActivityIndicator } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import {
  type AccentLook,
  accentStyle,
  depthStyle,
  faceLift,
  surfaceStyle,
  useStateTransition,
  type CtaLook,
  type Theme,
} from '@/theme';

import { ContentSwap } from './ContentSwap';
import { GoldFace, isDressed } from './GoldFace';
import { Icon } from './Icon';
import type { IconName } from './icons';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

const ICON_SIZE = 18;

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

/**
 * The big gold calls to action: a primary key from `md` up. The tall ones (`xl`, `lg`) stand on the wide
 * ledge, the shorter `md` on the narrow one (the mockup's 56 and 48 tall keys). Where a scheme dresses them
 * (Black's engraved face) they carry it; a small primary key keeps the plain gold.
 */
const ctaOf = (theme: Theme, variant: ButtonVariant, size: ButtonSize): CtaLook | undefined => {
  if (variant !== 'primary' || size === 'sm') return undefined;
  return size === 'md' ? theme.material.cta.narrow : theme.material.cta.wide;
};

/** The gold a primary key of this size is raised out of: the big ones' own look, else the plain accent. */
const primaryLook = (theme: Theme, size: ButtonSize): AccentLook =>
  ctaOf(theme, 'primary', size) ?? theme.material.accent;

/** The piece of the material a variant's key is raised out of. */
const keyMaterial = (theme: Theme, variant: ButtonVariant, size: ButtonSize) =>
  ({
    primary: primaryLook(theme, size),
    secondary: theme.material.raised,
    ghost: theme.material.raisedSm,
    quiet: theme.material.raisedSm,
    danger: theme.material.raisedSm,
  })[variant];

/** The keys that sit out of the card-sized material are small raised keys: they sink a little when held. */
const sinks = (variant: ButtonVariant) => variant !== 'primary' && variant !== 'secondary';

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

  // Black engraves songket over the whole face of the big gold calls to action, and stands them on a
  // thick ledge with a drop beneath (GoldFace). Only those read the press state.
  const cta = ctaOf(theme, variant, size);
  const dressed = cta !== undefined && isDressed(cta) ? cta : undefined;

  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      disabled={inactive}
      hitSlop={size === 'sm' ? SMALL_HIT_SLOP : undefined}
      accessibilityRole="button"
      accessibilityLabel={loading ? shownLabel : (accessibilityLabel ?? label)}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={[styles.base(size, variant), { opacity: disabled && !loading ? 0.45 : 1 }, fade]}
      // Held, the big gold key's ledge is gone: the label settles onto the taller face.
      pressedStyle={dressed && styles.heldBase(size)}
      sink={sinks(variant) ? theme.material.keySink : 0}
      shareState={dressed !== undefined}
      surface={{
        style: styles.surface(variant, size),
        pressed: styles.pressed(variant, size),
        bleed: variant === 'primary' || variant === 'secondary' ? 'card' : 'key',
      }}
    >
      {dressed && <GoldFace look={dressed} />}
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
        >
          {shownLabel}
        </Text>
      </ContentSwap>
    </PressableScale>
  );
}

const styles = StyleSheet.create((theme) => ({
  base: (size: ButtonSize, variant: ButtonVariant) => ({
    height: HEIGHT[size],
    // The key's base lies inside its box in Black: the label is centred on the face above it.
    paddingBottom: faceLift(keyMaterial(theme, variant, size)),
    paddingHorizontal: size === 'sm' ? theme.spacing.md + 2 : theme.spacing.lg,
    alignSelf: size === 'sm' ? ('flex-start' as const) : ('stretch' as const),
    // A key on a console, not a pill: controlled corners read as a physical object.
    borderRadius: theme.radii.control,
    justifyContent: 'center' as const,
  }),
  /** A held big gold key: no ledge to stand on, so nothing lifts the label. */
  heldBase: (size: ButtonSize) => ({
    paddingBottom: faceLift(primaryLook(theme, size).pressed),
  }),
  /** The key's material, drawn once into a texture behind its label (PressableScale's `surface`). */
  surface: (variant: ButtonVariant, size: ButtonSize) => ({
    borderRadius: theme.radii.control,
    // Raised out of the material; the lesser keys take the shallower lift, so they never compete with the
    // action. The gold keeps its dark edge only where the material says gold alone would not separate.
    ...{
      primary: accentStyle(primaryLook(theme, size)),
      secondary: surfaceStyle(theme.material.raised),
      ghost: surfaceStyle(theme.material.raisedSm),
      quiet: surfaceStyle(theme.material.raisedSm),
      danger: { ...surfaceStyle(theme.material.raisedSm), backgroundColor: theme.colors.dangerSoft },
    }[variant],
  }),
  /** Under a finger: the lift gives way to a shallow press (the gold sinks with its own warm shade). */
  pressed: (variant: ButtonVariant, size: ButtonSize) =>
    depthStyle(variant === 'primary' ? primaryLook(theme, size).pressed : theme.material.pressed),
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm },
}));
