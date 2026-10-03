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
  /** No background circle (nav bars). */
  plain?: boolean;
  /** On: the icon turns accent and fills (a favourite's heart). Its label should say what a press does. */
  active?: boolean;
  disabled?: boolean;
  testID?: string;
}

const SIZE = 34;
/** Extends the 34pt circle to a 44pt touch target. */
const HIT_SLOP = (44 - SIZE) / 2;

export function IconButton({
  icon,
  onPress,
  onLongPress,
  onPressOut,
  accessibilityLabel,
  plain = false,
  active = false,
  disabled = false,
  testID,
}: IconButtonProps) {
  const { theme } = useUnistyles();
  // Disabled eases in and out like every other control (e.g. Back while a sign-in connects).
  const fade = useStateTransition('opacity');
  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressOut={onPressOut}
      disabled={disabled}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={[styles.base(plain), { opacity: disabled ? 0.45 : 1 }, fade]}
      pressedStyle={plain ? undefined : styles.pressed}
    >
      <Icon
        name={icon}
        size={plain ? 24 : 20}
        color={active ? theme.colors.accentText : theme.colors.text}
        fill={active ? theme.colors.accentText : 'none'}
      />
    </PressableScale>
  );
}

const styles = StyleSheet.create((theme) => ({
  base: (plain: boolean) => ({
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    // A small raised key; `plain` (nav bars) stays flat, like an icon printed on the surface.
    backgroundColor: plain ? 'transparent' : theme.material.raisedSm.background,
    boxShadow: plain ? undefined : theme.material.raisedSm.shadow,
  }),
  pressed: { boxShadow: theme.material.pressed.shadow },
}));
