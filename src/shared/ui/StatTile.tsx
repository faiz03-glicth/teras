import type { ReactNode } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { CachedSurface } from './CachedSurface';
import { Icon } from './Icon';
import type { IconName } from './icons';
import { Text } from './Text';

export interface StatTileProps {
  label: string;
  value: string | number;
  /** Faint text after the value ("/92", " days"). */
  suffix?: string;
  icon?: { name: IconName; color: string };
  /** A line under the value (a pill, a caption). */
  footer?: ReactNode;
  /** Label above the value (Insights) instead of below it (Home, Profile). */
  labelFirst?: boolean;
  /** What a screen reader says instead of "label, value": for a value with more to it ("…, personal record"). */
  accessibilityLabel?: string;
  /**
   * A reading, not a control: a flat tile (the surface colour and a 1px border, no lift and no shadow), so
   * only the keys on a screen look raised. For stats nobody can press.
   */
  flat?: boolean;
  testID?: string;
}

/**
 * One number and its name in a small card: Home's Day teras / Active days / This week, and the Insights,
 * Calendar and Profile stats. Read as one phrase by screen readers ("Day teras, 12").
 */
export function StatTile({
  label,
  value,
  suffix,
  icon,
  footer,
  labelFirst = false,
  accessibilityLabel,
  flat = false,
  testID,
}: StatTileProps) {
  const caption = (
    <Text variant="caption" tone="secondary" numberOfLines={1}>
      {label}
    </Text>
  );
  return (
    <View
      style={flat ? styles.flatTile : styles.tile}
      testID={testID}
      accessible
      accessibilityLabel={accessibilityLabel ?? `${label}, ${value}${suffix ?? ''}`}
    >
      {!flat && <CachedSurface style={styles.surface} />}
      {icon && <Icon name={icon.name} size={20} color={icon.color} />}
      {labelFirst && caption}
      <Text variant="numeric2" numberOfLines={1}>
        {value}
        {suffix ? (
          <Text variant="headline" tone="tertiary" style={styles.suffix}>
            {suffix}
          </Text>
        ) : null}
      </Text>
      {!labelFirst && caption}
      {footer}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  tile: { flex: 1, gap: 6, padding: 14 },
  // The 1px border takes a point of the padding, so a flat tile is the size of a raised one.
  flatTile: {
    flex: 1,
    gap: 6,
    padding: 13,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  surface: {
    borderRadius: theme.radii.card,
    backgroundColor: theme.material.raised.background,
    boxShadow: theme.material.raised.shadow,
  },
  suffix: { fontSize: 15 },
}));
