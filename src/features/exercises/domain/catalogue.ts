import type { ExerciseRow } from '@/core/db/schema';

import { CATALOGUE } from './catalogue.generated';

/** A movement as the curation names it: each identity's names, then the searches it also answers. */
export interface CatalogueFamily {
  readonly names: readonly (readonly string[])[];
  readonly related: readonly string[];
}

/** One curated exercise: [search rank, family index (-1: none), identity in it, 1 when the plain form]. */
export type CatalogueEntry = readonly [rank: number, family: number, identity: number, plain: 0 | 1];

/** The curated library (scripts/exercise-dataset/curate.js), as build-curation.js writes it. */
export interface CatalogueData {
  readonly families: readonly CatalogueFamily[];
  readonly exercises: Readonly<Record<string, CatalogueEntry>>;
  readonly aliases: Readonly<Record<string, readonly string[]>>;
}

/**
 * Search ranks, lowest first: built-ins in library order (0-103), a person's own exercises, the dataset's
 * familiar forms (200+), its variations (1000+), and last a dropped exercise kept because a workout,
 * routine or favourite uses it.
 */
export const CUSTOM_RANK = 150;
export const RETIRED_RANK = 10_000;

/** What search knows of an exercise beyond its row. Internal: never shown. */
export interface SearchProfile {
  rank: number;
  /** Its movement's plain form ("Bench Press", not "Wide Grip Bench Press"). */
  plain: boolean;
  /** Other names for this very exercise: its movement's names and near-duplicates merged into it. */
  aliases: readonly string[];
  /** Searches it also answers: its movement's other forms and related movements. */
  related: readonly string[];
}

const NONE: readonly string[] = [];

const entryOf = (id: string): CatalogueEntry | undefined =>
  Object.prototype.hasOwnProperty.call(CATALOGUE.exercises, id) ? CATALOGUE.exercises[id] : undefined;

/** PURE: an exercise's search rank alone, cheap enough to sort the whole library by. */
export function rankOf(row: Pick<ExerciseRow, 'id' | 'isCustom'>): number {
  if (row.isCustom) return CUSTOM_RANK;
  return entryOf(row.id)?.[0] ?? RETIRED_RANK;
}

/** PURE: everything search knows of an exercise. Custom and retired ones are known by their name only. */
export function searchProfile(row: Pick<ExerciseRow, 'id' | 'isCustom'>): SearchProfile {
  const entry = row.isCustom ? undefined : entryOf(row.id);
  if (entry === undefined) return { rank: rankOf(row), plain: true, aliases: NONE, related: NONE };
  const [rank, familyIndex, identity, plain] = entry;
  const family = familyIndex >= 0 ? CATALOGUE.families[familyIndex] : undefined;
  const merged = CATALOGUE.aliases[row.id] ?? NONE;
  return {
    rank,
    plain: plain === 1,
    aliases: [...(family?.names[identity] ?? NONE), ...merged],
    related: family
      ? [...family.names.filter((_, index) => index !== identity).flat(), ...family.related]
      : NONE,
  };
}
