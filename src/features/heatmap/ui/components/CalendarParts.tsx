import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Icon, PressableScale, Text } from '@/shared/ui';

const LEVELS = [0, 1, 2, 3, 4] as const;

/** The Calendar's press, the same on every level: it dims and gives a little; nothing sinks in. */
export const FLAT_PRESS = { scaleTo: 0.97, pressedStyle: { opacity: 0.7 } } as const;

/** Less → More, then the no-details mark: flat swatches, as the grids above draw them. */
export function CalendarLegend() {
  return (
    <View
      style={styles.legend}
      accessible
      accessibilityLabel="Colour scale from no workout to peak. A dot marks a day logged with no details."
    >
      <Text variant="mini" tone="tertiary">
        Less
      </Text>
      {LEVELS.map((level) => (
        <View key={level} style={styles.swatch(level)} />
      ))}
      <Text variant="mini" tone="tertiary">
        More
      </Text>
      <View style={styles.noDetails}>
        <View style={styles.swatch(0)}>
          <View style={styles.dot} />
        </View>
        <Text variant="mini" tone="tertiary">
          No details
        </Text>
      </View>
    </View>
  );
}

/** One line of guidance under a level ("Tap a year for its months."). */
export function CalendarHint({ children }: { children: string }) {
  return (
    <Text variant="caption" tone="tertiary" align="center" style={styles.hint}>
      {children}
    </Text>
  );
}

/** The flat gold key: the one action a level asks for. */
export function GoldKey({ label, onPress, testID }: { label: string; onPress: () => void; testID?: string }) {
  return (
    <PressableScale
      {...FLAT_PRESS}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.key}
      testID={testID}
    >
      <Text variant="headline" tone="onAccent">
        {label}
      </Text>
    </PressableScale>
  );
}

/** The Calendar's 44 pt key: flat (the surface and a hairline), never the raised key of other screens. */
export function FlatKey({
  icon,
  label,
  onPress,
  disabled = false,
  testID,
}: {
  icon: 'chevron-left' | 'chevron-right';
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}) {
  const { theme } = useUnistyles();
  return (
    <PressableScale
      {...FLAT_PRESS}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={[styles.flatKey, disabled && styles.disabled]}
      testID={testID}
    >
      <Icon name={icon} size={20} color={theme.colors.text} />
    </PressableScale>
  );
}

/** A level's top bar: the flat back key, the title in the middle, and an optional line under it. */
export function CalendarHeader({
  title,
  sub,
  backLabel,
  onBack,
}: {
  title: string;
  sub?: string;
  backLabel: string;
  onBack: () => void;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.bar}>
        <FlatKey icon="chevron-left" label={backLabel} onPress={onBack} testID="calendar-back" />
        <Text
          variant="headline"
          weight="semibold"
          align="center"
          style={styles.title}
          accessibilityRole="header"
        >
          {title}
        </Text>
        <View style={styles.spacer} />
      </View>
      {sub !== undefined && (
        <Text variant="caption" tone="secondary" align="center">
          {sub}
        </Text>
      )}
    </View>
  );
}

/** A flat card: the surface and a hairline, no material. */
export function FlatCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create((theme) => ({
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  swatch: (level: (typeof LEVELS)[number]) => ({
    width: 10,
    height: 10,
    borderRadius: 2.5,
    backgroundColor: theme.heat[level],
    alignItems: 'center',
    justifyContent: 'center',
  }),
  noDetails: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: theme.spacing.md },
  dot: { width: 2, height: 2, borderRadius: 1, backgroundColor: theme.colors.accentText },
  hint: { marginTop: theme.spacing.sm },
  key: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
    backgroundColor: theme.colors.accent,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.accentEdge,
  },
  flatKey: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  disabled: { opacity: 0.4 },
  header: { gap: 2, paddingTop: theme.spacing.sm },
  bar: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  title: { flex: 1, fontSize: 17, lineHeight: 22 },
  spacer: { width: 44 },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
}));
