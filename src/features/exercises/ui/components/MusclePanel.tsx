import Animated from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';

import { Card, ChipRow } from '@/shared/ui';
import { layoutMotion } from '@/theme';

import type { MuscleFilterModel } from '../useMuscleFilter';
import { BodyMap } from './BodyMap';

/**
 * The muscle filter, open under the filter buttons: the body with the chosen muscle lit, every muscle as a
 * chip beneath it. The list below narrows with each pick while the panel stays, ready for the next.
 */
export function MusclePanel({ filter }: { filter: MuscleFilterModel }) {
  return (
    <Animated.View entering={layoutMotion.fadeUp} style={styles.panel} testID="muscle-panel">
      <Card>
        <BodyMap highlight={filter.highlight} onRegion={filter.onRegion} />
      </Card>
      <ChipRow
        scroll
        options={filter.options}
        value={filter.value}
        onChange={filter.onPick}
        accessibilityLabel="Muscle"
        testID="muscle-filter"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create((theme) => ({
  panel: { gap: theme.spacing.md },
}));
