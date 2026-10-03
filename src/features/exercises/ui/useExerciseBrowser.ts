import { useCallback, useLayoutEffect, useMemo } from 'react';

import type { ExerciseRow } from '@/core/db/schema';
import { browserSections, muscleBadge } from '@/features/exercises/domain/browse';
import { EQUIPMENT_LABELS, MUSCLE_LABELS, muscleSummary } from '@/features/exercises/domain/labels';
import { useWorkoutOwner } from '@/features/workouts/hooks/useWorkoutQueries';
import { openCreateExercise, openEquipmentFilter } from '@/shared/actions';

import { useExerciseList, useFavouriteIds, useRecentExercises } from '../hooks/useExerciseQueries';
import { useExerciseBrowserStore } from '../state/exerciseBrowserStore';
import { useMuscleFilter } from './useMuscleFilter';

/** One exercise as the browser lists it, ready to render. */
export interface ExerciseChoice {
  id: string;
  name: string;
  /** "Chest · Triceps · Shoulders". */
  muscles: string;
  /** Two letters from the primary muscle: "CH". */
  badge: string;
  custom: boolean;
  favourite: boolean;
  /** What a screen reader says for the row. */
  label: string;
}

export interface BrowserSection {
  key: 'favourites' | 'recent' | 'all';
  title: string;
  rows: ExerciseChoice[];
}

/** One of the two filter buttons: what it is set to, and what a screen reader says for it. */
export interface BrowserFilter {
  label: string;
  active: boolean;
  accessibilityLabel: string;
}

const NONE: readonly string[] = [];

const countExercises = (count: number) => `${count} exercise${count === 1 ? '' : 's'}`;

const filterOf = (name: string, chosen: string | null, all: string): BrowserFilter => {
  const label = chosen ?? all;
  return { label, active: chosen !== null, accessibilityLabel: `${name}, ${label}` };
};

/**
 * The exercise browser, shared by Add exercise and the Exercise library: search, the equipment filter
 * (a sheet) and the muscle filter (the body, opened in place above the list), then Favourites, Recent
 * and every exercise, forty at a time. What a tap on a row does is the screen's own business. Each time
 * it opens it starts from the whole library.
 */
export function useExerciseBrowser() {
  const owner = useWorkoutOwner();
  const query = useExerciseBrowserStore((state) => state.query);
  const muscle = useExerciseBrowserStore((state) => state.muscle);
  const equipment = useExerciseBrowserStore((state) => state.equipment);
  const shown = useExerciseBrowserStore((state) => state.shown);
  const setQuery = useExerciseBrowserStore((state) => state.setQuery);
  const showMore = useExerciseBrowserStore((state) => state.showMore);
  const clearFilters = useExerciseBrowserStore((state) => state.clearFilters);
  const clear = useExerciseBrowserStore((state) => state.clear);
  const muscles = useMuscleFilter();
  const library = useExerciseList(owner);
  const favourites = useFavouriteIds(owner);
  const recent = useRecentExercises(owner);
  const favouriteIds = favourites.data ?? NONE;
  const recentIds = recent.data ?? NONE;

  // Before the first paint, so a search left from the last visit never shows.
  useLayoutEffect(() => clear(), [clear]);

  const view = useMemo(() => {
    const found = browserSections(library.data ?? [], { query, favouriteIds, recentIds, muscle, equipment });
    const isFavourite = new Set(favouriteIds);
    const choice = (row: ExerciseRow): ExerciseChoice => {
      const muscles = muscleSummary(row);
      const favourite = isFavourite.has(row.id);
      return {
        id: row.id,
        name: row.name,
        muscles,
        badge: muscleBadge(row.primaryMuscle),
        custom: row.isCustom,
        favourite,
        label: `${row.name}, ${muscles}${favourite ? ', favourite' : ''}`,
      };
    };
    const sections: BrowserSection[] = [
      { key: 'favourites', title: 'Favourites', rows: found.favourites.map(choice) },
      { key: 'recent', title: 'Recent', rows: found.recent.map(choice) },
      {
        key: 'all',
        title: found.filtered ? countExercises(found.matches.length) : 'All exercises',
        rows: found.matches.slice(0, shown).map(choice),
      },
    ];
    return {
      sections: sections.filter((section) => section.rows.length > 0),
      remaining: Math.max(0, found.matches.length - shown),
      empty: found.matches.length === 0,
    };
  }, [equipment, favouriteIds, library.data, muscle, query, recentIds, shown]);

  const { refetch } = library;
  const status = library.isError
    ? ('error' as const)
    : library.isPending
      ? ('loading' as const)
      : ('ready' as const);

  return {
    status,
    query,
    placeholder: library.data ? `Search ${library.data.length} exercises` : 'Search exercises',
    equipmentFilter: filterOf('Equipment', equipment && EQUIPMENT_LABELS[equipment], 'All equipment'),
    muscleFilter: filterOf('Muscle', muscle && MUSCLE_LABELS[muscle], 'All muscles'),
    muscles,
    sections: view.sections,
    remaining: view.remaining,
    empty: status === 'ready' && view.empty,
    canClearFilters: muscle !== null || equipment !== null,
    onQueryChange: setQuery,
    onShowMore: showMore,
    onClearFilters: clearFilters,
    onClear: clear,
    onOpenEquipment: () => openEquipmentFilter(),
    onCreate: () => openCreateExercise(),
    onRetry: useCallback(() => void refetch(), [refetch]),
  };
}

export type ExerciseBrowserModel = ReturnType<typeof useExerciseBrowser>;
