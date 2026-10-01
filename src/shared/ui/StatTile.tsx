import type { ReactNode } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

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
  testID?: string;
}

/**
 * One number and its name in a small card: Home's Day teras / Active days / This week, and the Insights,
 * Calendar and Profile stats. Read as one phrase by screen readers ("Day teras, 12").
 */
export function StatTile({ label, value, suffix, icon, footer, labelFirst = false, testID }: StatTileProps) {
  const caption = (
    <Text variant="caption" tone="secondary" numberOfLines={1}>
      {label}
    </Text>
  );
  return (
    <View
      style={styles.tile}
      testID={testID}
      accessible
      accessibilityLabel={`${label}, ${value}${suffix ?? ''}`}
    >
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
  tile: {
    flex: 1,
    gap: 6,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: theme.glass?.card.background ?? theme.colors.surface,
    borderColor: theme.glass?.card.edge ?? theme.colors.border,
    boxShadow: theme.glass?.card.shadow ?? theme.elevation.card ?? undefined,
  },
  suffix: { fontSize: 15 },
}));
