import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { CachedSurface, HeatCell, Text } from '@/shared/ui';

/**
 * "2 this week" beside Home's title: a small well pressed into the page, with a swatch of the wave's colour.
 * The well's inner shadow is drawn once into a texture (CachedSurface): Android blurs a live one every frame.
 */
export function WeekChip({ label, accessibilityLabel }: { label: string; accessibilityLabel: string }) {
  return (
    <View style={styles.chip} accessible accessibilityLabel={accessibilityLabel} testID="home-week">
      <CachedSurface style={styles.well} bleed="none" />
      <HeatCell level={3} size={14} radius={4} />
      <Text variant="footnote" weight="semibold" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    height: 32,
    paddingLeft: 9,
    paddingRight: theme.spacing.md,
  },
  well: {
    borderRadius: 16,
    backgroundColor: theme.material.inset.background,
    boxShadow: theme.material.inset.shadow,
  },
}));
