/**
 * The history file's 29 exercise names, each matched to a built-in exercise of the library (none needed a
 * custom one). Matched by hand against the library the migrations seed, the same equipment always:
 * - exact: the same exercise under the library's naming ("Barbell Bench Press" → "Bench Press (Barbell)")
 * - alias: another name the library uses for it ("Machine Chest Fly" → "Pec Deck (Machine)")
 * - semantic: the closest movement, confirmed by the owner (12 Oct 2026)
 * Weighted Pull-Up and Weighted Chest Dip go to the bodyweight versions on the owner's word: their load is
 * the weight ADDED on a belt (0 on some sets), which is what a bodyweight exercise's weight means, and its
 * volume counts the body weight too.
 */

export type MatchType = 'exact' | 'alias' | 'semantic';

export interface ExerciseMatch {
  exerciseId: string;
  match: MatchType;
  confidence: 'high' | 'medium';
  note?: string;
}

export const EXERCISE_MATCHES: Readonly<Record<string, ExerciseMatch>> = {
  'Barbell Bench Press': { exerciseId: 'bench-press-barbell', match: 'exact', confidence: 'high' },
  'Barbell Reverse Curl': { exerciseId: 'reverse-curl-barbell', match: 'exact', confidence: 'high' },
  'Cable Crunch': { exerciseId: 'cable-crunch-cable', match: 'exact', confidence: 'high' },
  'Cable Face Pull': { exerciseId: 'face-pull-cable', match: 'exact', confidence: 'high' },
  'Cable Lateral Raise': {
    exerciseId: 'single-arm-lateral-raise-cable',
    match: 'alias',
    confidence: 'high',
    note: 'the file says single-arm cable',
  },
  'Cable Overhead Triceps Extension': {
    exerciseId: 'overhead-triceps-extension-rope-attachment-cable',
    match: 'alias',
    confidence: 'high',
    note: 'the file says rope',
  },
  'Cable Triceps Pushdown': { exerciseId: 'triceps-pushdown-cable', match: 'exact', confidence: 'high' },
  'Dumbbell Front Raise': { exerciseId: 'front-raise-dumbbell', match: 'exact', confidence: 'high' },
  'Dumbbell Hammer Curl': { exerciseId: 'hammer-curl-dumbbell', match: 'exact', confidence: 'high' },
  'Dumbbell Lateral Raise': { exerciseId: 'lateral-raise-dumbbell', match: 'exact', confidence: 'high' },
  'Dumbbell Rear Delt Fly': {
    exerciseId: 'rear-delt-reverse-fly-dumbbell',
    match: 'alias',
    confidence: 'high',
  },
  'Dumbbell Shoulder Press': { exerciseId: 'shoulder-press-dumbbell', match: 'exact', confidence: 'high' },
  'Hack Squat': { exerciseId: 'hack-squat-machine', match: 'exact', confidence: 'high' },
  'Incline Dumbbell Chest Press': {
    exerciseId: 'incline-bench-press-dumbbell',
    match: 'alias',
    confidence: 'high',
  },
  'Iso-Lateral Machine Row': {
    exerciseId: 'chest-supported-row-machine',
    match: 'semantic',
    confidence: 'medium',
    note: 'owner confirmed; loads kept as kg per side',
  },
  'Leg Extension': { exerciseId: 'leg-extension-machine', match: 'exact', confidence: 'high' },
  'Leg Press': { exerciseId: 'leg-press-machine', match: 'exact', confidence: 'high' },
  'Lying Leg Curl': { exerciseId: 'lying-leg-curl-machine', match: 'exact', confidence: 'high' },
  'Machine Chest Fly': { exerciseId: 'pec-deck-machine', match: 'alias', confidence: 'high' },
  'Machine Chest Press': { exerciseId: 'chest-press-machine', match: 'exact', confidence: 'high' },
  'Neutral-Grip Lat Pulldown': {
    exerciseId: 'lateral-pulldown-with-v-bar-cable',
    match: 'semantic',
    confidence: 'medium',
    note: 'owner confirmed (V bar: neutral grip)',
  },
  'One-Arm Dumbbell Row': { exerciseId: 'single-arm-row-dumbbell', match: 'alias', confidence: 'high' },
  'Reverse Pec Deck': { exerciseId: 'rear-delt-reverse-fly-machine', match: 'alias', confidence: 'high' },
  'Romanian Deadlift': { exerciseId: 'romanian-deadlift-barbell', match: 'exact', confidence: 'high' },
  'Seated Cable Row': { exerciseId: 'seated-cable-row-cable', match: 'exact', confidence: 'high' },
  'Standing Calf Raise': { exerciseId: 'standing-calf-raise-machine', match: 'exact', confidence: 'high' },
  'Weighted Chest Dip': {
    exerciseId: 'chest-dip',
    match: 'semantic',
    confidence: 'high',
    note: 'owner: bodyweight version, the load is added on top',
  },
  'Weighted Pull-Up': {
    exerciseId: 'pull-up',
    match: 'semantic',
    confidence: 'high',
    note: 'owner: bodyweight version, the load is added on top',
  },
  'Wide-Grip Lat Pulldown': {
    exerciseId: 'wide-grip-lat-pulldown-cable',
    match: 'exact',
    confidence: 'high',
  },
};
