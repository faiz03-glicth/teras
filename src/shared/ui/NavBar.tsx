import type { ReactNode } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { ContentSwap } from './ContentSwap';
import { IconButton } from './IconButton';
import { Text } from './Text';

export interface NavBarProps {
  title?: string;
  onBack?: () => void;
  backDisabled?: boolean;
  backLabel?: string;
  /** Trailing slot, e.g. a Skip button. */
  right?: ReactNode;
}

export function NavBar({ title, onBack, backDisabled = false, backLabel = 'Back', right }: NavBarProps) {
  return (
    <View style={styles.bar}>
      <View style={styles.side}>
        {/* Back fades in and out when a screen's page gains or loses it (never pops). */}
        <ContentSwap id={onBack ? 'back' : 'none'}>
          {onBack && (
            <IconButton
              icon="chevron-left"
              plain
              onPress={onBack}
              disabled={backDisabled}
              accessibilityLabel={backLabel}
            />
          )}
        </ContentSwap>
      </View>
      {title ? (
        <Text variant="headline" numberOfLines={1} style={styles.title} accessibilityRole="header">
          {title}
        </Text>
      ) : null}
      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  bar: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: -6,
  },
  side: { minWidth: 34, flexDirection: 'row', alignItems: 'center' },
  right: { justifyContent: 'flex-end' },
  title: { flex: 1, textAlign: 'center', marginHorizontal: theme.spacing.sm },
}));
