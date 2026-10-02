import { memo } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { HeatGrid } from '@/features/heatmap/domain/grid';
import { Card, HoldableHeatmap } from '@/shared/ui';

import { HERO_COLUMNS } from '../../config/heroPattern';
import { StepHeading } from './StepHeading';

const GAP = 5;
const MAX_CELL = 20;
/** Screen side padding (24 × 2) + card padding (8 × 2) + card border. */
const HORIZONTAL_CHROME = 48 + 16 + 2;

/** A pager page: memoised, so the other page changing (or the pager landing) never re-renders the heatmap. */
export const WelcomeStep = memo(function WelcomeStep({ grid }: { grid: HeatGrid }) {
  const { width } = useWindowDimensions();
  // 20pt cells as designed, shrinking only as much as a narrow phone needs.
  const cell = Math.min(
    MAX_CELL,
    Math.floor((width - HORIZONTAL_CHROME - GAP * (HERO_COLUMNS - 1)) / HERO_COLUMNS),
  );

  return (
    <>
      <Card style={styles.card}>
        <View style={styles.hero}>
          {/* Press and hold: it collapses and stacks itself back up, with sound and haptics. */}
          <HoldableHeatmap grid={grid} cellSize={cell} gap={GAP} radius={6} animateIn />
        </View>
      </Card>
      <StepHeading title="Teras" body="Log every set. See every training day." style={styles.heading} />
    </>
  );
});

const styles = StyleSheet.create((theme) => ({
  card: { paddingVertical: 18, paddingHorizontal: 8 },
  hero: { alignItems: 'center', paddingVertical: 10 },
  heading: { marginTop: theme.spacing.xs + 2 },
}));
