import Animated from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { layoutMotion } from '@/theme';

import { Icon } from './Icon';
import { Text } from './Text';

export interface BannerProps {
  message: string;
  testID?: string;
}

/**
 * Inline error message (dangerSoft background, danger text), announced by screen readers when it appears.
 * It rises into place (the motion system's fadeUp) and fades when cleared: calm, never a shake.
 */
export function Banner({ message, testID }: BannerProps) {
  const { theme } = useUnistyles();
  return (
    <Animated.View
      entering={layoutMotion.fadeUp}
      exiting={layoutMotion.fade.out}
      testID={testID}
      style={styles.banner}
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={message}
    >
      <Icon name="alert" size={18} color={theme.colors.danger} />
      <Text variant="footnote" tone="danger" style={styles.text}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create((theme) => ({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: 14,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.dangerSoft,
  },
  text: { flex: 1 },
}));
