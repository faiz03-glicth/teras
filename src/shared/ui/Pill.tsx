import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Icon } from './Icon';
import type { IconName } from './icons';
import { Text } from './Text';

export interface PillProps {
  label: string;
  icon?: IconName;
  /** Accent: good news (a rise, a day with activity). */
  tone?: 'default' | 'accent';
}

/** A small rounded status label ("+12% vs last", "Strong · 4–5 check-ins"). */
export function Pill({ label, icon, tone = 'default' }: PillProps) {
  const { theme } = useUnistyles();
  const color = tone === 'accent' ? theme.colors.accentText : theme.colors.text2;
  return (
    <View style={styles.pill(tone)}>
      {icon && <Icon name={icon} size={14} color={color} />}
      <Text variant="caption" style={{ color }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  pill: (tone: 'default' | 'accent') => ({
    alignSelf: 'flex-start' as const,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: theme.radii.pill,
    backgroundColor: tone === 'accent' ? theme.colors.accentSoft : theme.colors.subtle,
  }),
}));
