import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useStateTransition } from '@/theme';

import { Icon } from './Icon';
import type { IconName } from './icons';
import { PressableScale } from './PressableScale';

export interface IconButtonProps {
  icon: IconName;
  onPress: () => void;
  /** Held down (steppers repeat while held). A long press does not also fire `onPress`. */
  onLongPress?: () => void;
  onPressOut?: () => void;
  accessibilityLabel: string;
  /** No key: an icon printed on the surface, for rows that carry several (a routine's edit and reorder). */
  plain?: boolean;
  /** 'danger' draws the icon in the danger colour, for a key that removes something. */
  tone?: 'primary' | 'danger';
  /** On: the icon turns accent and fills (a favourite's heart). Its label should say what a press does. */
  active?: boolean;
  disabled?: boolean;
  testID?: string;
}

/** A square key, and the smaller footprint of a plain icon; each extended to a 44pt touch target. */
const KEY_SIZE = 40;
const PLAIN_SIZE = 34;
const KEY_HIT_SLOP = (44 - KEY_SIZE) / 2;
const PLAIN_HIT_SLOP = (44 - PLAIN_SIZE) / 2;

export function IconButton({
  icon,
  onPress,
  onLongPress,
  onPressOut,
  accessibilityLabel,
  plain = false,
  tone = 'primary',
  active = false,
  disabled = false,
  testID,
}: IconButtonProps) {
  const { theme } = useUnistyles();
  // Disabled eases in and out like every other control (e.g. Back while a sign-in connects).
  const fade = useStateTransition('opacity');
  const ink = tone === 'danger' ? theme.colors.danger : theme.colors.text;
  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressOut={onPressOut}
      disabled={disabled}
      hitSlop={plain ? PLAIN_HIT_SLOP : KEY_HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={[styles.base(plain), { opacity: disabled ? 0.45 : 1 }, fade]}
      surface={plain ? undefined : { style: styles.surface, pressed: styles.pressed }}
    >
      <Icon
        name={icon}
        size={plain ? 24 : 20}
        color={active ? theme.colors.accentText : ink}
        fill={active ? theme.colors.accentText : 'none'}
      />
    </PressableScale>
  );
}

const styles = StyleSheet.create((theme) => ({
  base: (plain: boolean) => ({
    width: plain ? PLAIN_SIZE : KEY_SIZE,
    height: plain ? PLAIN_SIZE : KEY_SIZE,
    borderRadius: plain ? PLAIN_SIZE / 2 : theme.radii.key,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  }),
  // A small raised key with softened corners, like the app's buttons, drawn once into a texture behind its
  // icon (PressableScale's `surface`); `plain` has none, an icon printed on the surface.
  surface: {
    borderRadius: theme.radii.key,
    backgroundColor: theme.material.raisedSm.background,
    boxShadow: theme.material.raisedSm.shadow,
  },
  pressed: { boxShadow: theme.material.pressed.shadow },
}));
