import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Icon } from './Icon';
import type { IconName } from './icons';

export interface IconBadgeProps {
  icon: IconName | (string & {});
  /** Resolved colour; the badge fill is this colour at 14% opacity. */
  color: string;
  size?: number;
}

/** A tinted rounded square holding an icon. Decorative. */
export function IconBadge({ icon, color, size = 40 }: IconBadgeProps) {
  return (
    <View style={styles.badge(size)} accessible={false} importantForAccessibility="no-hide-descendants">
      <View style={[StyleSheet.absoluteFill, styles.fill(color)]} />
      <Icon name={icon} size={size < 36 ? 18 : 20} color={color} />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  badge: (size: number) => ({
    width: size,
    height: size,
    borderRadius: Math.round(size * theme.radii.badgeRatio),
    overflow: 'hidden' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  }),
  fill: (color: string) => ({ backgroundColor: color, opacity: 0.14 }),
}));
