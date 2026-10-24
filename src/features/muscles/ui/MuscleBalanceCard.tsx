import { memo } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { BalanceTile } from '@/features/muscles/domain/muscleCards';
import { Card, Text } from '@/shared/ui';

import { MuscleRadar } from './components/MuscleRadar';
import { RadarKey } from './components/RadarKey';
import { useMuscleBalance } from './useMuscleBalance';

/**
 * Profile's "Muscle balance": the sets done per muscle in the last 4 weeks against the 4 before, as a spider
 * web, with the muscle that gained most and the one that needs work. Before the sets are read the web is
 * drawn bare and the tiles hold their places; with nothing logged it says how to get a web.
 */
export const MuscleBalanceCard = memo(function MuscleBalanceCard() {
  const vm = useMuscleBalance();
  return (
    <Card style={styles.card} testID="muscle-balance-card">
      <View style={styles.head}>
        <Text variant="headline" accessibilityRole="header">
          Muscle balance
        </Text>
        <Text variant="caption" tone="tertiary">
          Sets per muscle
        </Text>
      </View>

      <MuscleRadar now={vm.now} before={vm.before} accessibilityLabel={vm.accessibilityLabel} />

      {vm.empty ? (
        <Text variant="footnote" tone="secondary" align="center" testID="muscle-balance-empty">
          Log a workout to see your balance
        </Text>
      ) : (
        <>
          <RadarKey />
          {vm.note && (
            <Text variant="caption" tone="tertiary" align="center" testID="muscle-balance-note">
              {vm.note}
            </Text>
          )}
          {vm.tiles.length > 0 && (
            <View style={styles.tiles}>
              {vm.tiles.map((tile) => (
                <Tile key={tile.label} tile={tile} />
              ))}
            </View>
          )}
        </>
      )}
    </Card>
  );
});

function Tile({ tile }: { tile: BalanceTile }) {
  return (
    <View
      style={styles.tile}
      accessible
      accessibilityLabel={`${tile.label}, ${tile.name}, ${tile.sub.trim()}`}
    >
      <Text variant="caption" tone="secondary">
        {tile.label}
      </Text>
      <Text variant="title3" numberOfLines={1}>
        {tile.name}
      </Text>
      <Text variant="footnote" tone={tile.tone}>
        {tile.sub}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: { gap: theme.spacing.md },
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  tiles: { flexDirection: 'row', gap: theme.spacing.md },
  // A flat tile: the card's own fill with a hairline, not another lift.
  tile: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: 14,
    borderRadius: theme.radii.control + 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.material.raised.background,
  },
}));
