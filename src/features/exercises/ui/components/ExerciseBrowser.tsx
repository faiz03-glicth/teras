import { memo, startTransition, useEffect, useState } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionLabel,
  Text,
  TextField,
} from '@/shared/ui';

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
      <ExerciseResults results={browser.results} onPick={onPick} onInfo={onInfo} />
    </>
  );
}

interface ExerciseResultsProps {
  results: ExerciseBrowserModel['results'];
  onPick: (id: string) => void;
  onInfo: (id: string) => void;
}

/**
 * The lists under the filters. Memoised: a pick re-renders the body and chips at once, and this only when
 * the (deferred) results change, so the highlight never waits for the list.
 */
const ExerciseResults = memo(function ExerciseResults({ results, onPick, onInfo }: ExerciseResultsProps) {
  const budget = useRowBudget(results);
  const left = { rows: budget };
  return (
    <>
      {results.status === 'loading' && <LoadingState label="Loading exercises" />}
      {results.status === 'error' && (
        <Card>
          <ErrorState title="Couldn't load exercises" onRetry={results.onRetry} />
        </Card>
      )}

      {results.sections.map((section) => (
        <View key={section.key} style={styles.group}>
          <SectionHeading
            title={section.title}
            onClearFilters={
              section.key === 'all' && results.canClearFilters ? results.onClearFilters : undefined
            }
          />
          <Card tight divided>
            {sectionItems(section, left, onPick, onInfo)}
          </Card>
        </View>
      ))}

      {results.remaining > 0 && (
        <Button
          label={`Show more (${results.remaining} left)`}
          variant="secondary"
          onPress={results.onShowMore}
          testID="exercises-more"
        />
      )}

      {results.empty && (
        <Card>
          <EmptyState
            icon="search"
            title="No exercise matches"
            body="Check the spelling, clear a filter, or create it yourself."
            secondaryAction={{ label: 'Clear', onPress: results.onClear }}
            action={{ label: 'Create exercise', onPress: results.onCreate }}
          />
        </Card>
      )}
    </>
  );
});

/** Rows drawn as soon as the results change: a screenful under the body. The rest follow a frame later. */
const FIRST_ROWS = 12;

/**
 * How many rows to draw: a screenful at once when the results change, then the whole page in a
 * background update React can interrupt, so a pick never waits for rows below the fold.
 */
function useRowBudget(results: unknown): number {
  const [state, setState] = useState({ for: results, all: false });
  if (state.for !== results) setState({ for: results, all: false });
  const all = state.for === results && state.all;
  useEffect(() => {
    if (all) return;
    const frame = requestAnimationFrame(() =>
      startTransition(() => setState((now) => (now.for === results ? { ...now, all: true } : now))),
    );
    return () => cancelAnimationFrame(frame);
  }, [all, results]);
  return all ? Number.POSITIVE_INFINITY : FIRST_ROWS;
}

/**
 * A section's headings and rows as one flat list of children. Rows are keyed by their place on the page,
 * not by exercise: picking another muscle gives the same row components new exercises to show (a cheap
 * update) instead of tearing forty rows down and building forty new ones (measured at over two seconds
 * on the phone in a dev build). Headings sit between them, keyed by muscle.
 */
function sectionItems(
  section: ExerciseBrowserModel['results']['sections'][number],
  left: { rows: number },
  onPick: (id: string) => void,
  onInfo: (id: string) => void,
) {
  let slot = 0;
  const items = (section.groups ?? [{ key: section.key, title: null, rows: section.rows }]).flatMap(
    (group) => [
      ...(group.title === null
        ? []
        : [
            <Text
              key={`group-${group.key}`}
              variant="caption"
              tone="tertiary"
              weight="semibold"
              accessibilityRole="header"
              style={styles.muscle}
            >
              {group.title}
            </Text>,
          ]),
      ...group.rows
        .slice(0, Math.max(0, left.rows))
        .map((choice) => (
          <ExerciseRow
            key={`row-${(left.rows--, slot++)}`}
            choice={choice}
            onPress={onPick}
            onInfo={onInfo}
            testID={`${section.key}-${choice.id}`}
          />
        )),
    ],
  );
  // A heading whose rows are not drawn yet waits for them.
  return items.filter((item, index) => !(item.type === Text && items[index + 1]?.type !== ExerciseRow));
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
  // A plain heading per muscle inside the list's one card: no card of its own.
  muscle: { paddingTop: theme.spacing.md, paddingBottom: theme.spacing.xs },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
}));
