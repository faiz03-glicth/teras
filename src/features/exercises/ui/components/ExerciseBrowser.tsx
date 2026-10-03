import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Button, Card, EmptyState, ErrorState, LoadingState, SectionLabel, TextField } from '@/shared/ui';

import type { ExerciseBrowserModel } from '../useExerciseBrowser';
import { ExerciseRow } from './ExerciseRow';
import { FilterButton } from './FilterButton';
import { MusclePanel } from './MusclePanel';

export interface ExerciseBrowserProps {
  browser: ExerciseBrowserModel;
  onPick: (id: string) => void;
  onInfo: (id: string) => void;
}

/**
 * Search and the equipment and muscle filters (the body opens in place, above the list it narrows), then
 * the lists: Favourites and Recent first, then every exercise (or the matches), forty at a time. Shared by
 * Add exercise and the Exercise library; each says what picking one does.
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
          expanded={browser.muscles.open}
          onPress={browser.muscles.onToggle}
          accessibilityLabel={browser.muscleFilter.accessibilityLabel}
          testID="exercise-filter-muscle"
        />
      </View>

      {browser.muscles.open && <MusclePanel filter={browser.muscles} />}

      {browser.status === 'loading' && <LoadingState label="Loading exercises" />}
      {browser.status === 'error' && (
        <Card>
          <ErrorState title="Couldn't load exercises" onRetry={browser.onRetry} />
        </Card>
      )}

      {browser.sections.map((section) => (
        <View key={section.key} style={styles.group}>
          <SectionHeading
            title={section.title}
            onClearFilters={
              section.key === 'all' && browser.canClearFilters ? browser.onClearFilters : undefined
            }
          />
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

/** A section's title; over the matches while a filter is on, with the way to take them all off. */
function SectionHeading({ title, onClearFilters }: { title: string; onClearFilters?: () => void }) {
  if (!onClearFilters) return <SectionLabel>{title}</SectionLabel>;
  return (
    <View style={styles.heading}>
      <SectionLabel>{title}</SectionLabel>
      <Button
        label="Clear filters"
        variant="ghost"
        size="sm"
        onPress={onClearFilters}
        testID="exercise-clear-filters"
      />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  // Close under the search, as one control: what to look for, then where.
  filters: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: -theme.spacing.sm },
  group: { gap: theme.spacing.sm },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
}));
