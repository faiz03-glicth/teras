import { useCallback, useMemo, useState } from 'react';

import type { ExerciseRow } from '@/core/db/schema';
import { BROWSER_PAGE, browserSections, muscleBadge } from '@/features/exercises/domain/browse';
import { muscleSummary } from '@/features/exercises/domain/labels';
import { useWorkoutOwner } from '@/features/workouts/hooks/useWorkoutQueries';

import { useExerciseList, useFavouriteIds, useRecentExercises } from '../hooks/useExerciseQueries';

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

const NONE: readonly string[] = [];

const countExercises = (count: number) => `${count} exercise${count === 1 ? '' : 's'}`;

/**
 * The exercise browser, shared by Add exercise and the Exercise library: search, then Favourites,
 * Recent and every exercise, forty at a time. What a tap on a row does is the screen's own business.
 */
export function useExerciseBrowser() {
  const owner = useWorkoutOwner();
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(BROWSER_PAGE);
  const library = useExerciseList(owner);
  const favourites = useFavouriteIds(owner);
  const recent = useRecentExercises(owner);
  const favouriteIds = favourites.data ?? NONE;
  const recentIds = recent.data ?? NONE;

  const view = useMemo(() => {
    const found = browserSections(library.data ?? [], { query, favouriteIds, recentIds });
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
  }, [favouriteIds, library.data, query, recentIds, shown]);

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
    sections: view.sections,
    remaining: view.remaining,
    empty: status === 'ready' && view.empty,
    onQueryChange: useCallback((text: string) => {
      setQuery(text);
      setShown(BROWSER_PAGE);
    }, []),
    onShowMore: useCallback(() => setShown((count) => count + BROWSER_PAGE), []),
    onClear: useCallback(() => setQuery(''), []),
    onRetry: useCallback(() => void refetch(), [refetch]),
  };
}

export type ExerciseBrowserModel = ReturnType<typeof useExerciseBrowser>;
