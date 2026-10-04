import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import {
  BMI_BANDS,
  BMI_CATEGORY_LABELS,
  bandShare,
  bandStart,
  type BmiCategory,
} from '@/features/training/domain/body';
import { Text } from '@/shared/ui';

export interface BmiScaleProps {
  /** Where the BMI sits on the scale, from 0 to 1. */
  position: number;
  category: BmiCategory;
}

/**
 * The four BMI bands as one bar, the person's place marked on it, the edges numbered above and the bands
 * named below with theirs in bold. Drawing only: the BMI line beside it says the same in words, so a
 * screen reader skips this.
 */
export function BmiScale({ position, category }: BmiScaleProps) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.scale}
      testID="bmi-scale"
    >
      <View style={styles.bar}>
        {BMI_BANDS.map((band, index) => (
          <View key={band.category} style={styles.band(band.category, bandShare(band), index)} />
        ))}
        {BMI_BANDS.slice(1).map((band) => (
          <Text key={band.from} variant="mini" tone="tertiary" style={styles.edge(bandStart(band))}>
            {band.from}
          </Text>
        ))}
        <View style={styles.marker(position)} testID="bmi-marker" />
      </View>
      <View style={styles.names}>
        {BMI_BANDS.map((band) => {
          const current = band.category === category;
          return (
            <Text
              key={band.category}
              variant="mini"
              tone={current ? 'primary' : 'tertiary'}
              weight={current ? 'semibold' : undefined}
              align="center"
              style={styles.name(bandShare(band))}
            >
              {BMI_CATEGORY_LABELS[band.category]}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const BAR_HEIGHT = 12;
const MARKER = 20;
const EDGE_LABEL_WIDTH = 40;

const styles = StyleSheet.create((theme) => ({
  scale: { gap: theme.spacing.sm, paddingTop: theme.spacing.xl },
  bar: { flexDirection: 'row', height: BAR_HEIGHT },
  // The theme has no green (the prototype's "normal"): the bands are the neutral, two heat golds, then the
  // warning colour, so they still read in order from under to over.
  band: (category: BmiCategory, share: number, index: number) => ({
    flex: share,
    height: BAR_HEIGHT,
    backgroundColor: {
      underweight: theme.colors.border2,
      normal: theme.heat[2],
      overweight: theme.heat[3],
      obese: theme.colors.danger,
    }[category],
    ...(index === 0 && { borderTopLeftRadius: BAR_HEIGHT / 2, borderBottomLeftRadius: BAR_HEIGHT / 2 }),
    ...(index === BMI_BANDS.length - 1 && {
      borderTopRightRadius: BAR_HEIGHT / 2,
      borderBottomRightRadius: BAR_HEIGHT / 2,
    }),
  }),
  edge: (start: number) => ({
    position: 'absolute' as const,
    top: -theme.spacing.lg,
    left: `${start * 100}%` as `${number}%`,
    width: EDGE_LABEL_WIDTH,
    marginLeft: -EDGE_LABEL_WIDTH / 2,
    textAlign: 'center' as const,
  }),
  marker: (position: number) => ({
    position: 'absolute' as const,
    top: (BAR_HEIGHT - MARKER) / 2,
    left: `${position * 100}%` as `${number}%`,
    width: MARKER,
    height: MARKER,
    marginLeft: -MARKER / 2,
    borderRadius: MARKER / 2,
    backgroundColor: theme.colors.surface,
    borderWidth: 3,
    borderColor: theme.colors.text,
  }),
  names: { flexDirection: 'row' },
  name: (share: number) => ({ flex: share }),
}));
