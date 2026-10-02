import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Button, Card, EmptyState, ErrorState, LoadingState, SectionLabel, TextField } from '@/shared/ui';

import type { ExerciseBrowserModel } from '../useExerciseBrowser';
import { ExerciseRow } from './ExerciseRow';
import { FilterButton } from './FilterButton';

export interface ExerciseBrowserProps {
  browser: ExerciseBrowserModel;
  onPick: (id: string) => void;
  onInfo: (id: string) => void;
}

/**
 * Search and the equipment and muscle filters, then the lists: Favourites and Recent first, then every
 * exercise (or the matches), forty at a time. Shared by Add exercise and the Exercise library; each says
 * what picking one does.
 */
export function ExerciseBrowser({ browser, onPick, onInfo }: ExerciseBrowserProps) {
  return (
    <>
      <TextField
        label="Search exercises"
        icon="search"
        value={browser.query}
        onChangeText={browser.onQueryChange}
        placeholder={browser.placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        testID="exercise-search"
      />

      <View style={styles.filters}>
        <FilterButton
          label={browser.equipmentFilter.label}
          active={browser.equipmentFilter.active}
          onPress={browser.onOpenEquipment}
          accessibilityLabel={browser.equipmentFilter.accessibilityLabel}
          testID="exercise-filter-equipment"
        />
        <FilterButton
          label={browser.muscleFilter.label}
          active={browser.muscleFilter.active}
          onPress={browser.onOpenMuscle}
          accessibilityLabel={browser.muscleFilter.accessibilityLabel}
          testID="exercise-filter-muscle"
        />
      </View>

      {browser.status === 'loading' && <LoadingState label="Loading exercises" />}
      {browser.status === 'error' && (
        <Card>
          <ErrorState title="Couldn't load exercises" onRetry={browser.onRetry} />
        </Card>
      )}

      {browser.sections.map((section) => (
        <View key={section.key} style={styles.group}>
          <SectionLabel>{section.title}</SectionLabel>
          <Card tight divided>
            {section.rows.map((choice) => (
              <ExerciseRow
                key={choice.id}
                choice={choice}
                onPress={onPick}
                onInfo={onInfo}
                testID={`${section.key}-${choice.id}`}
              />
            ))}
          </Card>
        </View>
      ))}

      {browser.remaining > 0 && (
        <Button
          label={`Show more (${browser.remaining} left)`}
          variant="secondary"
          onPress={browser.onShowMore}
          testID="exercises-more"
        />
      )}

      {browser.empty && (
        <Card>
          <EmptyState
            icon="search"
            title="No exercise matches"
            body="Check the spelling, clear a filter, or create it yourself."
            secondaryAction={{ label: 'Clear', onPress: browser.onClear }}
            action={{ label: 'Create exercise', onPress: browser.onCreate }}
          />
        </Card>
      )}
    </>
  );
}

const styles = StyleSheet.create((theme) => ({
  // Close under the search, as one control: what to look for, then where.
  filters: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: -theme.spacing.sm },
  group: { gap: theme.spacing.sm },
}));
