/**
 * PURE: maps the open exercise dataset (github.com/hasaneyldrm/exercises-dataset; its data is MIT-licensed,
 * its media is Gym visual's and is never imported) onto Teras's exercise model. Build time only: used by
 * build-seed.js, which writes the seed migration. Nothing here runs in the app.
 *
 * Dataset vocabulary is normalised to Teras's one canonical set (MUSCLES, EQUIPMENT, EXERCISE_TYPES),
 * names to the library's style ("Bench Press (Barbell)") and ids to its slugs (`bench-press-barbell`).
 * Records that do not fit the model (cardio, balls, rollers, ergometers) are skipped with a reason.
 */

/** Dataset `target` (its primary muscle) -> Teras muscle. Missing: not a lift Teras logs. */
const TARGET = {
  pectorals: 'chest',
  lats: 'lats',
  'upper back': 'upper_back',
  spine: 'lower_back',
  delts: 'shoulders',
  traps: 'traps',
  'levator scapulae': 'traps',
  biceps: 'biceps',
  triceps: 'triceps',
  forearms: 'forearms',
  abs: 'abs',
  'serratus anterior': 'abs',
  quads: 'quads',
  hamstrings: 'hamstrings',
  glutes: 'glutes',
  calves: 'calves',
  adductors: 'adductors',
  abductors: 'abductors',
};

/** Dataset secondary muscles -> Teras muscle; the rest (hip flexors, ankles, feet, neck) are dropped. */
const SECONDARY = {
  chest: 'chest',
  'upper chest': 'chest',
  'latissimus dorsi': 'lats',
  lats: 'lats',
  'upper back': 'upper_back',
  back: 'upper_back',
  rhomboids: 'upper_back',
  'lower back': 'lower_back',
  shoulders: 'shoulders',
  deltoids: 'shoulders',
  'rear deltoids': 'shoulders',
  'rotator cuff': 'shoulders',
  traps: 'traps',
  trapezius: 'traps',
  biceps: 'biceps',
  brachialis: 'biceps',
  triceps: 'triceps',
  forearms: 'forearms',
  wrists: 'forearms',
  'wrist flexors': 'forearms',
  'wrist extensors': 'forearms',
  'grip muscles': 'forearms',
  core: 'abs',
  obliques: 'abs',
  abdominals: 'abs',
  'lower abs': 'abs',
  quadriceps: 'quads',
  hamstrings: 'hamstrings',
  glutes: 'glutes',
  calves: 'calves',
  soleus: 'calves',
  groin: 'adductors',
  'inner thighs': 'adductors',
};

/** Dataset equipment -> Teras equipment. Missing (balls, rollers, cardio machines): skipped. */
const EQUIPMENT = {
  barbell: 'barbell',
  'olympic barbell': 'barbell',
  'ez barbell': 'barbell',
  'trap bar': 'barbell',
  dumbbell: 'dumbbell',
  'leverage machine': 'machine',
  'smith machine': 'machine',
  'sled machine': 'machine',
  assisted: 'machine',
  cable: 'cable',
  rope: 'cable',
  'body weight': 'bodyweight',
  weighted: 'bodyweight',
  kettlebell: 'kettlebell',
  band: 'band',
  'resistance band': 'band',
};

const EQUIPMENT_LABEL = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  machine: 'Machine',
  cable: 'Cable',
  kettlebell: 'Kettlebell',
  band: 'Band',
};

/** Leading words naming the equipment, taken off before the label goes on the end. Longest first. */
const LEADING = [
  'olympic barbell',
  'ez barbell',
  'trap bar',
  'smith machine',
  'smith',
  'sled machine',
  'sled',
  'lever',
  'barbell',
  'dumbbell',
  'cable',
  'kettlebell',
  'resistance band',
  'band',
];

const TIMED = /\b(plank|hold|wall sit|isometric|dead hang|stretch)\b/;

/** Markers of another photo or animation of the same exercise, not another exercise. */
const MEDIA_VARIANT = /\((male|female|back pov|side pov)\)|\bv\. ?\d+\b/g;

/** Equipment Teras has no filter for, named only in the exercise's name. */
const UNSUPPORTED_IN_NAME = /\b(stability ball|bosu ball|medicine ball)\b/;

const titleCase = (text) =>
  text
    .split(' ')
    .filter(Boolean)
    .map((word) => word.replace(/^(\(?)([a-z])/, (_, open, letter) => open + letter.toUpperCase()))
    .join(' ');

/** "barbell bench press" + barbell -> "Bench Press (Barbell)"; "push-up" -> "Push Up". */
function teraName(rawName, equipment) {
  let name = rawName.toLowerCase().replace(MEDIA_VARIANT, '').replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  for (const lead of LEADING) {
    if (name.startsWith(`${lead} `)) {
      name = name.slice(lead.length + 1);
      break;
    }
  }
  const label = EQUIPMENT_LABEL[equipment];
  return label ? `${titleCase(name)} (${label})` : titleCase(name);
}

const slug = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const FILLER = new Set(['flat', 'the', 'a', 'standard', 'regular', 'exercise']);

/**
 * The key two names share when they are the same exercise: lower case, no punctuation, filler words
 * dropped, "pushups" and "push up" alike, plurals and word order ignored. "Barbell Bench Press (Flat)"
 * and "Bench Press (Barbell)" share one.
 */
function sameExerciseKey(name) {
  return name
    .toLowerCase()
    .replace(/(push|pull|chin|sit)[\s-]?ups?\b/g, '$1 up')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((word) => word && !FILLER.has(word))
    .map((word) => (word.length > 3 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word))
    .sort()
    .join(' ');
}

/** One dataset record -> a Teras exercise, or the reason it is skipped. */
function mapRecord(record) {
  if (typeof record.name !== 'string' || record.name.trim() === '') return { skip: 'no name' };
  const primary = TARGET[record.target];
  if (!primary) return { skip: `target "${record.target}"` };
  const equipment = EQUIPMENT[record.equipment];
  if (!equipment) return { skip: `equipment "${record.equipment}"` };
  if (UNSUPPORTED_IN_NAME.test(record.name.toLowerCase())) return { skip: 'ball named in the exercise' };

  const secondary = [];
  for (const muscle of record.secondary_muscles ?? []) {
    const mapped = SECONDARY[muscle];
    if (mapped && mapped !== primary && !secondary.includes(mapped)) secondary.push(mapped);
  }
  const name = teraName(record.name, equipment);
  const timed = equipment === 'bodyweight' && TIMED.test(record.name.toLowerCase());
  return {
    exercise: {
      id: slug(name),
      name,
      equipment,
      primaryMuscle: primary,
      secondaryMuscles: secondary,
      type: timed ? 'timed' : record.equipment === 'body weight' ? 'bodyweight' : 'weighted',
      // The dataset says nothing about compound lifts: two or more muscles worked besides the main one.
      isCompound: secondary.length >= 2,
    },
  };
}

/**
 * The whole dataset -> the exercises to add. The library's own exercises win: a record matching one, by
 * id or by sameExerciseKey, is a duplicate, as is a second record for the same exercise (the lower
 * dataset id is kept). Deterministic: the same input always gives the same output, in dataset id order.
 */
function mapDataset(records, existing) {
  const ids = new Set(existing.map((exercise) => exercise.id));
  const keys = new Set(existing.map((exercise) => sameExerciseKey(exercise.name)));
  const added = [];
  const skipped = {};
  let duplicates = 0;
  const sorted = [...records].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  for (const record of sorted) {
    const result = mapRecord(record);
    if (result.skip) {
      skipped[result.skip] = (skipped[result.skip] ?? 0) + 1;
      continue;
    }
    const { exercise } = result;
    const key = sameExerciseKey(exercise.name);
    if (ids.has(exercise.id) || keys.has(key)) {
      duplicates += 1;
      continue;
    }
    ids.add(exercise.id);
    keys.add(key);
    added.push(exercise);
  }
  return { added, duplicates, skipped };
}

module.exports = { mapDataset, mapRecord, sameExerciseKey, teraName };
