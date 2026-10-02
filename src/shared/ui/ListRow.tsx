import type { ReactNode } from 'react';
import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import type { ActivityColorKey, Theme } from '@/theme';

import { Icon } from './Icon';
import { IconBadge } from './IconBadge';
import type { IconName } from './icons';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { Toggle } from './Toggle';

export type ListRowIconColor = ActivityColorKey | 'accent' | 'danger';

export interface ListRowProps {
  title: string;
  description?: string;
  /** Cut the description to this many lines with an ellipsis; unset lets it wrap. */
  descriptionLines?: number;
  /** Drawn before the text, in place of an icon (a day's heat swatch). */
  leading?: ReactNode;
  icon?: IconName;
  iconColor?: ListRowIconColor;
  value?: string;
  trailing?: 'chevron' | 'toggle' | 'none';
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
  danger?: boolean;
  /** Centred title only (e.g. "Log out"). */
  centered?: boolean;
  /** 9pt vertical padding instead of 12 (login benefits). */
  compact?: boolean;
  onPress?: () => void;
  accessibilityHint?: string;
  testID?: string;
}

const resolveIconColor = (theme: Theme, color: ListRowIconColor): string =>
  color === 'accent'
    ? theme.colors.accentText
    : color === 'danger'
      ? theme.colors.danger
      : theme.activity[color];

export function ListRow({
  title,
  description,
  descriptionLines,
  leading,
  icon,
  iconColor = 'accent',
  value,
  trailing = 'none',
  toggleValue = false,
  onToggle,
  danger = false,
  centered = false,
  compact = false,
  onPress,
  accessibilityHint,
  testID,
}: ListRowProps) {
  const { theme } = useUnistyles();
  const body = (
    <>
      {leading}
      {icon && <IconBadge icon={icon} color={resolveIconColor(theme, iconColor)} size={34} />}
      <View style={styles.text(centered)}>
        <Text
          variant="sub"
          weight="semibold"
          tone={danger ? 'danger' : 'primary'}
          align={centered ? 'center' : 'left'}
        >
          {title}
        </Text>
        {description ? (
          <Text variant="footnote" tone="secondary" numberOfLines={descriptionLines}>
            {description}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="footnote" tone="secondary">
          {value}
        </Text>
      ) : null}
      {trailing === 'chevron' && <Icon name="chevron-right" size={18} color={theme.colors.text3} />}
      {trailing === 'toggle' && onToggle && (
        <Toggle
          value={toggleValue}
          onChange={onToggle}
          accessibilityLabel={title}
          testID={testID && `${testID}-toggle`}
        />
      )}
    </>
  );

  if (onPress && trailing !== 'toggle') {
    return (
      <PressableScale
        testID={testID}
        onPress={onPress}
        scaleTo={0.985}
        accessibilityRole="button"
        accessibilityLabel={description ? `${title}, ${description}` : title}
        accessibilityHint={accessibilityHint}
        style={styles.row(compact)}
      >
        {body}
      </PressableScale>
    );
  }
  return (
    <View testID={testID} style={styles.row(compact)} accessible={trailing !== 'toggle'}>
      {body}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: (compact: boolean) => ({
    minHeight: 44,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.spacing.md,
    paddingVertical: compact ? 9 : theme.spacing.md,
  }),
  text: (centered: boolean) => ({ flex: 1, gap: 1, alignItems: centered ? ('center' as const) : undefined }),
}));
