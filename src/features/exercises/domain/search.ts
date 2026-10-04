import type { ExerciseRow } from '@/core/db/schema';

import { rankOf, searchProfile } from './catalogue';
import { EQUIPMENT_LABELS, MUSCLE_LABELS } from './labels';

/** Shorthand people type at the gym, expanded into the words it stands for before matching. */
const SHORTHAND: Readonly<Record<string, string>> = {
  ohp: 'overhead press',
  rdl: 'romanian deadlift',
  bb: 'barbell',
  db: 'dumbbell',
  kb: 'kettlebell',
  pullup: 'pull up',
  pushup: 'push up',
  pressup: 'press up',
  chinup: 'chin up',
  situp: 'sit up',
  skullcrusher: 'skull crusher',
};

/** Other words a query word also finds: "delt" finds the shoulders as well as "Rear Delt Row". */
const SYNONYMS: Readonly<Record<string, readonly string[]>> = {
  delt: ['shoulder'],
  ham: ['hamstring'],
  abdominal: ['abs'],
  core: ['abs'],
};

/** Plurals the plain rule gets wrong. Muscles are named in the plural, so both sides are made singular. */
const SINGULAR: Readonly<Record<string, string>> = {
  calves: 'calf',
  flies: 'fly',
  flyes: 'fly',
  flye: 'fly',
  biceps: 'bicep',
  triceps: 'tricep',
  ups: 'up',
};

/**
 * Words saying how or with what, not which movement. A search naming one prefers the exercises that have
 * it but still lists the rest: "dumbbell shoulder press" puts the dumbbell press first.
 */
const HOW_WORDS = new Set([
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'kettlebell',
  'band',
  'smith',
  'seated',
  'standing',
]);

/** How well an exercise answers a query, best first. */
const EXACT = 0; // It is what was asked for: its name, or another name for it, is the query.
const PHRASE = 1; // The query is a phrase of its name, its movement's names or its main muscle.
const STARTS = 2; // As a phrase, but some word only starts one: "press" in "Pressdown", or one still being typed.
const WORDS = 3; // Every word matches its name, movement, equipment or main muscle.
const WEAK = 4; // Some word matches only a muscle it works secondarily.

const NONE: readonly string[] = [];

function singular(word: string): string {
  const irregular = SINGULAR[word];
  if (irregular !== undefined) return irregular;
  if (word.length <= 3) return word;
  if (/(sses|ches|shes)$/.test(word)) return word.slice(0, -2);
  if (word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.endsWith('s') && !/(ss|us|is)$/.test(word)) return word.slice(0, -1);
  return word;
}

/** Lower case and split: "Farmer's Walks" -> ["farmers", "walks"]. */
const wordsOf = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/'/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

/** As `wordsOf`, singular: "Farmer's Walks" -> ["farmer", "walk"]. */
const toWords = (text: string): string[] => wordsOf(text).map(singular);

const coreOf = (words: readonly string[]): string[] => words.filter((word) => !HOW_WORDS.has(word));

/** What search reads of one exercise, worked out once per row object and reused for every keystroke. */
interface RowIndex {
  readonly rank: number;
  readonly plain: boolean;
  /** Its name's words, less the equipment label ("Bench Press (Barbell)" -> bench, press). */
  readonly name: readonly string[];
  /** The name less its how-words: what movement it is. */
  readonly core: readonly string[];
  readonly aliases: readonly (readonly string[])[];
  readonly related: readonly (readonly string[])[];
  readonly primary: readonly string[];
  readonly secondary: readonly string[];
  /** Words a strong match may use: name, other names, movement, equipment and main muscle. */
  readonly strong: readonly string[];
  /** Words a how-word is looked for in: the name and the equipment. */
  readonly how: readonly string[];
}

const indexes = new WeakMap<ExerciseRow, RowIndex>();

function indexOf(row: ExerciseRow): RowIndex {
  const cached = indexes.get(row);
  if (cached !== undefined) return cached;
  const profile = searchProfile(row);
  const label = ` (${EQUIPMENT_LABELS[row.equipment]})`;
  const bare = (text: string) => (text.endsWith(label) ? text.slice(0, -label.length) : text);
  const name = toWords(bare(row.name));
  const aliases = profile.aliases.map((alias) => coreOf(toWords(bare(alias))));
  const related = profile.related.map((phrase) => coreOf(toWords(phrase)));
  const equipment = toWords(EQUIPMENT_LABELS[row.equipment]);
  const primary = toWords(MUSCLE_LABELS[row.primaryMuscle]);
  const index: RowIndex = {
    rank: profile.rank,
    plain: profile.plain,
    name,
    core: coreOf(name),
    aliases,
    related,
    primary,
    secondary: row.secondaryMuscles.flatMap((muscle) => toWords(MUSCLE_LABELS[muscle])),
    strong: [...name, ...aliases.flat(), ...related.flat(), ...equipment, ...primary],
    how: [...name, ...equipment],
  };
  indexes.set(row, index);
  return index;
}

/** One word of the query, with any other words it also finds. */
interface Term {
  /** The word made singular, as an exercise's words are: "squats" -> "squat". */
  readonly word: string;
  /** What it finds the start of: the word as typed, which may still be being typed ("pres", not "pre"). */
  readonly start: string;
  /** It only finds whole words: a single letter typed past, the T of "t bar", starts too many. */
  readonly whole: boolean;
  readonly also: readonly string[];
}

const termOf = (word: string, start: string, whole: boolean): Term => ({
  word,
  start,
  whole,
  also: SYNONYMS[word] ?? NONE,
});

function queryTerms(query: string): Term[] {
  const typed = wordsOf(query);
  return typed.flatMap((raw, at) => {
    const word = singular(raw);
    const expanded = SHORTHAND[word];
    if (expanded !== undefined) return wordsOf(expanded).map((one) => termOf(one, one, false));
    return [termOf(word, raw, raw.length === 1 && at < typed.length - 1)];
  });
}

type Match = (term: Term, word: string) => boolean;

/** The whole word is the term: "press" is "Press", not "Pressdown". */
const is: Match = (term, word) => word === term.word || term.also.includes(word);
/** A word matches when it starts with the term: typing "bicep" finds "Biceps", "ress" never finds "Press". */
const finds: Match = (term, word) =>
  is(term, word) ||
  (!term.whole && (word.startsWith(term.start) || term.also.some((other) => word.startsWith(other))));
const findsAny = (term: Term, words: readonly string[]): boolean => words.some((word) => finds(term, word));

/** The phrase is the query, word for word. */
const isQuery = (phrase: readonly string[], terms: readonly Term[]): boolean =>
  phrase.length === terms.length && terms.every((term, at) => is(term, phrase[at] ?? ''));

/** The query is in the phrase, its words together and in order. */
function holdsQuery(phrase: readonly string[], terms: readonly Term[], match: Match): boolean {
  for (let start = 0; start + terms.length <= phrase.length; start += 1) {
    if (terms.every((term, at) => match(term, phrase[start + at] ?? ''))) return true;
  }
  return false;
}

function quality(index: RowIndex, terms: readonly Term[]): number {
  if (index.plain && (isQuery(index.core, terms) || index.aliases.some((alias) => isQuery(alias, terms)))) {
    return EXACT;
  }
  const phrases = [index.name, index.primary, ...index.aliases, ...index.related];
  if (phrases.some((phrase) => holdsQuery(phrase, terms, is))) return PHRASE;
  if (phrases.some((phrase) => holdsQuery(phrase, terms, finds))) return STARTS;
  if (terms.every((term) => findsAny(term, index.strong))) return WORDS;
  return WEAK;
}

interface Hit {
  readonly row: ExerciseRow;
  /** How many of the query's how-words it lacks. */
  readonly missing: number;
  readonly quality: number;
  readonly rank: number;
}

const compareText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

const compareHits = (a: Hit, b: Hit): number =>
  a.missing - b.missing ||
  a.quality - b.quality ||
  a.rank - b.rank ||
  a.row.name.length - b.row.name.length ||
  compareText(a.row.name, b.row.name);

/**
 * PURE: the exercises in library order: built-ins as the library lists them, then a person's own, then
 * the familiar forms of the rest, then their variations.
 */
export function byRank(rows: readonly ExerciseRow[]): ExerciseRow[] {
  return rows
    .map((row) => ({ row, rank: rankOf(row) }))
    .sort((a, b) => a.rank - b.rank || compareText(a.row.name, b.row.name))
    .map(({ row }) => row);
}

/**
 * PURE: the exercises matching `query`, best first. Every word of the query has to start a word of the
 * exercise's name, its movement's names, its equipment or its muscles, except a how-word ("dumbbell",
 * "seated"), which only puts the exercises that have it first. Then the exercise that is what was asked
 * for comes first (its name or another name for it is the query), then the query as a phrase of its names
 * or main muscle (whole words before word starts), then every word matched, then a match only through a
 * muscle it works secondarily. Ties go to the library's order. Deterministic: no history, no randomness.
 * A blank query is the library order.
 */
export function searchExercises(rows: readonly ExerciseRow[], query: string): ExerciseRow[] {
  const terms = queryTerms(query);
  if (terms.length === 0) return byRank(rows);
  const onlyHow = terms.every((term) => HOW_WORDS.has(term.word));
  const core = onlyHow ? terms : terms.filter((term) => !HOW_WORDS.has(term.word));
  const preferred = onlyHow ? [] : terms.filter((term) => HOW_WORDS.has(term.word));
  const hits: Hit[] = [];
  for (const row of rows) {
    const index = indexOf(row);
    if (!core.every((term) => findsAny(term, index.strong) || findsAny(term, index.secondary))) continue;
    hits.push({
      row,
      missing: preferred.filter((term) => !findsAny(term, index.how)).length,
      quality: quality(index, core),
      rank: index.rank,
    });
  }
  return hits.sort(compareHits).map((hit) => hit.row);
}
