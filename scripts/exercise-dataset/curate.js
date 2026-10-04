/**
 * PURE: curates the exercise library for search. Every exercise gets a movement family and a tier (0 = the
 * familiar form, 1 = a variation), and the imported dataset loses its noise: near-duplicates, stretches,
 * combos, misnamed and highly specialised records. Build time only; nothing here runs in the app.
 *
 * A family is one movement whatever the equipment ("shoulder press"). Its phrases are grouped into
 * identities, names for the same exercise ("shoulder press", "overhead press", "military press"). A dataset
 * exercise is familiar when its name is just an identity of a familiar family ("seated" and "standing"
 * aside), a variation when the rest of its name is known modifiers ("single arm", "incline", "close grip"),
 * and dropped otherwise. Built-ins are always kept and always familiar: they are the curated library.
 */

/** "Standing Crunch" -> "Standing Rope Crunch"; "Pushdown" -> "Rope Pushdown". */
function withRope(name) {
  const [first, ...rest] = name.split(' ');
  return /^(standing|seated|kneeling|lying)$/i.test(first)
    ? [first, 'Rope', ...rest].join(' ')
    : `Rope ${name}`;
}

/** Spelling, typo and encoding fixes for dataset names, applied in order before anything else. */
const NAME_FIXES = [
  [/в°/g, '°'],
  [/^45(?:°| degrees?)\s*/i, ''],
  [/\brevers\b/gi, 'Reverse'],
  [/\bpeacher\b/gi, 'Preacher'],
  [/_shoulder\b/gi, ''],
  [/\b(flyes|flye|flys|flies)\b/gi, 'Fly'],
  [/\bbiceps curl/gi, 'Bicep Curl'],
  [/\btricep\b/gi, 'Triceps'],
  [/\blateral pulldown\b/gi, 'Lat Pulldown'],
  [/\bpull down\b/gi, 'Pulldown'],
  [/\bpush down\b/gi, 'Pushdown'],
  [/\bcross over\b/gi, 'Crossover'],
  [/\bjack knife\b/gi, 'Jackknife'],
  [/\bez bar\b/gi, 'EZ Bar'],
  [/\bone (arm|hand)(ed)?\b/gi, 'Single Arm'],
  [/\bone leg(ged)?\b/gi, 'Single Leg'],
  [/\balternate\b/gi, 'Alternating'],
  [/\bskullcrusher\b/gi, 'Skull Crusher'],
  [/\b(pull|chin|push|sit) ups\b/gi, (_, word) => `${word} Up`],
  [/\bcrunches\b/gi, 'Crunch'],
  [
    /\b(curl|squat|lunge|dip|row|raise|shrug|extension|kickback|twist|thruster|swing|bridge|thrust|crossover|kick)s\b/gi,
    (_, word) => word,
  ],
  [/\s+\b(male|female)\b/gi, ''],
  // The dataset's names for exercises gym users know by another name.
  [/^air bike$/i, 'Bicycle Crunch'],
  [/\b(alternating )?heel touchers\b/gi, 'Heel Touch'],
  [/\bside bent\b/gi, 'Side Bend'],
  [/\brollerout\b/gi, 'Rollout'],
  [/\bwrist rollerer\b/gi, 'Wrist Roller'],
  [/\bleg hip raise\b/gi, 'Leg Raise'],
  [/\bcrunch floor\b/gi, 'Crunch'],
  [/\bstanding leg calf raise\b/gi, 'Standing Calf Raise'],
  [/^single leg squat \(pistol\)/i, 'Pistol Squat'],
  [/^vertical leg raise \(on parallel bars\)/i, "Captain's Chair Leg Raise"],
  [/\bcaptains chair\b/gi, "Captain's Chair"],
  [/\bhorizontal pallof press\b/gi, 'Pallof Press'],
  [/\bbench seated\b/gi, 'Seated'],
  [/\blying single extension\b/gi, 'Lying Single Arm Extension'],
  // Details that do not make another exercise: form cues, set-up, both limbs (the default).
  [/^basic\s+/i, ''],
  [/\bstraight back\s+/gi, ''],
  [/\bclean grip\s+|\s*\(clean grip\)/gi, ''],
  [/\bhigh pulley\s+/gi, ''],
  [/\btwo (arms?|legs?)\s+/gi, ''],
  [/\s*\(chest pad\)/gi, ''],
  [/\s*\(with (barbell|dumbbell|kettlebell|band|cable)\)/gi, ''],
  [/\s*\(on dip pull up cage\)|\s+on dip cage\b/gi, ''],
  [/\s+on leg press( machine)?\b/gi, ''],
  [/^(.*?)\s*\((?:with )?rope attachment\)/i, (_, name) => withRope(name)],
  [/\s{2,}/g, ' '],
];

const EQUIPMENT_LABELS = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  machine: 'Machine',
  cable: 'Cable',
  bodyweight: 'Bodyweight',
  kettlebell: 'Kettlebell',
  band: 'Band',
};
/** Equipment named in an exercise's name says nothing its equipment does not. */
const EQUIPMENT_WORDS = new Set([
  'barbell',
  'dumbbell',
  'dumbbells',
  'cable',
  'machine',
  'band',
  'kettlebell',
  'bodyweight',
  'lever',
  'smith',
  'sled',
  'resistance',
  'ez',
]);
/** Words that do not make another exercise: a seated and a standing dumbbell press are one press. */
const NEUTRAL = new Set(['seated', 'standing', 'flat', 'full', 'the', 'a', 'exercise', 'version']);

/** Words a variation may add to its movement: side, grip, angle, position and support. */
const MODIFIERS = new Set([
  'single',
  'arm',
  'arms',
  'leg',
  'legs',
  'alternating',
  'double',
  'close',
  'wide',
  'narrow',
  'reverse',
  'grip',
  'neutral',
  'underhand',
  'overhand',
  'pronated',
  'supinated',
  'palms',
  'palm',
  'in',
  'up',
  'down',
  'incline',
  'decline',
  'lying',
  'kneeling',
  'bent',
  'over',
  'straight',
  'behind',
  'neck',
  'head',
  'rope',
  'v',
  'bar',
  'with',
  'weighted',
  'assisted',
  'on',
  'bench',
  'floor',
  'high',
  'low',
  'front',
  'rear',
  'side',
  'cross',
  'body',
  'overhead',
  'deficit',
  'pause',
  'box',
  'parallel',
  'ring',
  'rings',
  'plate',
  'stance',
  'elevated',
  'feet',
  'hand',
  'hands',
  'supported',
  'hanging',
  'lateral',
  'jump',
  'walking',
  'split',
  'wall',
  'hammer',
  'stiff',
  'attachment',
]);
/** Modifier words that only complete another ("single arm", "close grip"), so are not counted. */
const PARTNER_WORDS = new Set([
  'arm',
  'arms',
  'leg',
  'legs',
  'grip',
  'over',
  'body',
  'in',
  'up',
  'down',
  'with',
  'on',
  'bar',
  'hand',
  'hands',
  'feet',
  'stance',
  'palms',
  'palm',
  'attachment',
]);
/** More modifiers than this and the record is too specialised for a normal gym user. */
const MAX_MODIFIERS = 2;
/** Most modifier words a family phrase may be split by ("seated wide grip row" is a seated row). */
const MAX_GAP = 3;

/** Grip words say nothing about a leg exercise; a name using them is a naming variant, not an exercise. */
const GRIP_WORDS = new Set([
  'grip',
  'hammer',
  'palm',
  'palms',
  'neutral',
  'pronated',
  'supinated',
  'underhand',
  'overhand',
]);
const LEG_MUSCLES = new Set(['quads', 'calves', 'adductors', 'abductors']);

/** Records that are not lifts Teras logs, by what they are. */
const NOT_LIFTS = [
  [/\b(stretch|stretching|pose|yoga|sphinx|upward facing dog)\b/, 'a stretch or yoga pose'],
  [/\b(circles?|pelvic tilt|inchworm)\b/, 'a mobility drill'],
  [
    /\b(planche|front lever|back lever|maltese|skin the cat)\b|^(flag|handstand|elevator)$/,
    'a gymnastics skill',
  ],
  [/\b(battling ropes|sprints?|skier|quick feet|boxing|jump down|forward jump|backward jump)\b/, 'cardio'],
];
/** A record naming one of these outside its movement needs kit Teras has no filter for, or is two in one. */
const DROP_WORDS = new Map([
  ['ball', 'needs an exercise ball'],
  ['towel', 'needs a towel'],
  ['blaster', 'needs an arm blaster'],
  ['stepbox', 'needs a step box'],
  ['to', 'two movements in one'],
  ['and', 'two movements in one'],
  ['plus', 'two movements in one'],
  ['throw', 'two movements in one'],
  ['pass', 'two movements in one'],
]);

/** The primary muscles each body region's movements work. A record outside them is misnamed. */
const REGION_MUSCLES = {
  chest: ['chest', 'shoulders', 'triceps'],
  back: [
    'lats',
    'upper_back',
    'lower_back',
    'traps',
    'biceps',
    'forearms',
    'shoulders',
    'hamstrings',
    'glutes',
    'chest',
  ],
  shoulders: ['shoulders', 'traps', 'upper_back', 'triceps', 'chest'],
  arms: ['biceps', 'triceps', 'forearms'],
  legs: ['quads', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors', 'lower_back'],
  core: ['abs', 'lower_back', 'glutes', 'adductors', 'abductors', 'shoulders', 'quads', 'hamstrings'],
  fullBody: null,
};

/**
 * The movement families, by body region. `ids` are its identities, each a list of names for one exercise,
 * the first being its usual name; `common: false` marks a real but specialised family, all of whose
 * members are variations; `related` are searches it also answers (an Arnold press is a shoulder press);
 * `modifiers` are words only this movement may add ("oblique" crunch) and `excludes` words it must not
 * have. The longest matching phrase wins, so "incline bench press" is not a "bench press" with "incline".
 */
const FAMILY_REGIONS = {
  chest: [
    { id: 'bench_press', ids: [['bench press']] },
    {
      id: 'incline_bench_press',
      ids: [['incline bench press', 'incline press', 'incline chest press']],
      related: ['bench press'],
    },
    {
      id: 'decline_bench_press',
      ids: [['decline bench press', 'decline press', 'decline chest press']],
      related: ['bench press'],
    },
    {
      id: 'close_grip_bench_press',
      ids: [['close grip bench press', 'close grip press']],
      related: ['bench press'],
    },
    { id: 'chest_press', ids: [['chest press']], related: ['bench press'] },
    { id: 'floor_press', ids: [['floor press']], related: ['bench press'], common: false },
    {
      id: 'chest_fly',
      ids: [
        [
          'chest fly',
          'fly',
          'cable fly crossover',
          'cable fly',
          'fly crossover',
          'cable crossover',
          'crossover',
        ],
        ['pec deck', 'pec deck fly', 'seated fly'],
      ],
    },
    {
      id: 'push_up',
      ids: [['push up', 'pushup', 'press up']],
      modifiers: ['diamond', 'clap', 'plyo', 'handstand', 'knees'],
    },
    { id: 'chest_dip', ids: [['chest dip']], related: ['dip'] },
  ],
  back: [
    { id: 'pullover', ids: [['pullover']] },
    { id: 'lat_pulldown', ids: [['lat pulldown', 'pulldown', 'front pulldown']] },
    {
      id: 'straight_arm_pulldown',
      ids: [['straight arm pulldown', 'straight arm lat pulldown']],
      related: ['lat pulldown'],
    },
    { id: 'pull_up', ids: [['pull up', 'pullup']] },
    { id: 'chin_up', ids: [['chin up', 'chinup']], related: ['pull up'] },
    { id: 'muscle_up', ids: [['muscle up']], related: ['pull up'] },
    {
      id: 'bent_over_row',
      ids: [['bent over row', 'row', 'barbell row', 'dumbbell row']],
      excludes: ['standing'],
    },
    {
      id: 'seated_row',
      ids: [['seated cable row', 'seated row', 'cable row', 'low row', 'low seated row']],
      related: ['row'],
    },
    { id: 't_bar_row', ids: [['t bar row']], related: ['row'] },
    {
      id: 'chest_supported_row',
      ids: [['chest supported row', 'incline row', 'incline bench row', 'prone row']],
      related: ['row'],
    },
    {
      id: 'inverted_row',
      ids: [['inverted row', 'suspended row', 'bodyweight row']],
      related: ['row'],
      modifiers: ['knees'],
    },
    { id: 'pendlay_row', ids: [['pendlay row']], related: ['row'], common: false },
    { id: 'high_row', ids: [['high row']], related: ['row'], common: false },
    { id: 'renegade_row', ids: [['renegade row']], related: ['row'], common: false },
    { id: 'deadlift', ids: [['deadlift']] },
    {
      id: 'romanian_deadlift',
      ids: [['romanian deadlift', 'stiff leg deadlift', 'straight leg deadlift', 'rdl']],
      related: ['deadlift'],
    },
    { id: 'sumo_deadlift', ids: [['sumo deadlift']], related: ['deadlift'] },
    { id: 'rack_pull', ids: [['rack pull']], related: ['deadlift'] },
    { id: 'good_morning', ids: [['good morning']] },
    {
      id: 'back_extension',
      ids: [
        ['back extension', 'hyperextension'],
        ['reverse hyperextension', 'reverse hyper'],
      ],
    },
    { id: 'shrug', ids: [['shrug']] },
    { id: 'face_pull', ids: [['face pull']] },
    { id: 'pull_apart', ids: [['band pull apart', 'pull apart']] },
    { id: 'dead_hang', ids: [['dead hang']] },
  ],
  shoulders: [
    { id: 'overhead_press', ids: [['overhead press', 'shoulder press', 'military press']] },
    { id: 'arnold_press', ids: [['arnold press']], related: ['shoulder press', 'overhead press'] },
    { id: 'push_press', ids: [['push press']], related: ['shoulder press', 'overhead press'] },
    { id: 'landmine_press', ids: [['landmine press']], related: ['shoulder press'] },
    { id: 'lateral_raise', ids: [['lateral raise', 'side lateral raise', 'side raise']] },
    { id: 'front_raise', ids: [['front raise', 'forward raise', 'front shoulder raise']] },
    {
      id: 'rear_delt_fly',
      ids: [
        [
          'rear delt reverse fly',
          'rear delt fly',
          'reverse fly',
          'rear fly',
          'rear lateral raise',
          'rear delt raise',
          'bent over lateral raise',
        ],
      ],
      modifiers: ['crossover'],
    },
    { id: 'rear_delt_row', ids: [['rear delt row']], related: ['row'], common: false },
    { id: 'upright_row', ids: [['upright row']] },
    {
      id: 'shoulder_rotation',
      ids: [
        ['external rotation', 'shoulder external rotation', 'external shoulder rotation'],
        ['internal rotation', 'shoulder internal rotation', 'internal shoulder rotation'],
      ],
    },
  ],
  arms: [
    { id: 'bicep_curl', ids: [['bicep curl', 'curl', 'barbell curl', 'dumbbell curl']] },
    { id: 'ez_bar_curl', ids: [['ez bar curl', 'ez curl']], related: ['bicep curl'] },
    { id: 'hammer_curl', ids: [['hammer curl']], related: ['bicep curl'], modifiers: ['preacher'] },
    { id: 'preacher_curl', ids: [['preacher curl']], related: ['bicep curl'] },
    { id: 'incline_curl', ids: [['incline curl', 'incline bicep curl']], related: ['bicep curl'] },
    { id: 'concentration_curl', ids: [['concentration curl']], related: ['bicep curl'] },
    {
      id: 'reverse_curl',
      ids: [['reverse curl', 'reverse grip curl', 'reverse bicep curl']],
      related: ['bicep curl'],
    },
    { id: 'drag_curl', ids: [['drag curl']], related: ['bicep curl'], common: false },
    { id: 'spider_curl', ids: [['spider curl']], related: ['bicep curl'], common: false },
    { id: 'zottman_curl', ids: [['zottman curl']], related: ['bicep curl'], common: false },
    { id: 'wrist_curl', ids: [['wrist curl']] },
    {
      id: 'reverse_wrist_curl',
      ids: [['reverse wrist curl', 'back wrist curl']],
      related: ['wrist curl'],
      common: false,
    },
    { id: 'wrist_roller', ids: [['wrist roller']] },
    {
      id: 'triceps_pushdown',
      ids: [
        ['triceps pushdown', 'pushdown', 'triceps pressdown', 'pressdown'],
        ['triceps rope pushdown', 'rope pushdown'],
      ],
    },
    {
      id: 'triceps_extension',
      ids: [['triceps extension'], ['overhead triceps extension', 'overhead extension']],
    },
    {
      id: 'skull_crusher',
      ids: [['skull crusher', 'lying triceps extension', 'lying extension']],
      related: ['triceps extension'],
    },
    { id: 'triceps_kickback', ids: [['triceps kickback', 'kickback']] },
    { id: 'triceps_dip', ids: [['triceps dip', 'dip']] },
    { id: 'bench_dip', ids: [['bench dip']], related: ['dip'], modifiers: ['knees'] },
  ],
  legs: [
    {
      id: 'squat',
      ids: [
        ['squat', 'back squat', 'barbell squat'],
        ['bodyweight squat', 'air squat'],
      ],
    },
    { id: 'front_squat', ids: [['front squat']], related: ['squat'] },
    { id: 'goblet_squat', ids: [['goblet squat']], related: ['squat'] },
    { id: 'hack_squat', ids: [['hack squat']], related: ['squat'] },
    { id: 'split_squat', ids: [['split squat'], ['bulgarian split squat']], related: ['squat', 'lunge'] },
    { id: 'sumo_squat', ids: [['sumo squat']], related: ['squat'] },
    { id: 'jump_squat', ids: [['jump squat', 'squat jump']], related: ['squat'] },
    { id: 'pistol_squat', ids: [['pistol squat']], related: ['squat'], common: false },
    { id: 'sissy_squat', ids: [['sissy squat']], related: ['squat'], common: false },
    { id: 'zercher_squat', ids: [['zercher squat']], related: ['squat'], common: false },
    { id: 'overhead_squat', ids: [['overhead squat']], related: ['squat'], common: false },
    { id: 'box_squat', ids: [['box squat', 'bench squat']], related: ['squat'], common: false },
    { id: 'leg_press', ids: [['leg press']] },
    { id: 'leg_extension', ids: [['leg extension']] },
    {
      id: 'leg_curl',
      ids: [['leg curl', 'hamstring curl'], ['lying leg curl'], ['seated leg curl'], ['standing leg curl']],
    },
    {
      id: 'nordic_curl',
      ids: [['nordic curl', 'nordic hamstring curl', 'inverse leg curl']],
      related: ['leg curl'],
    },
    { id: 'glute_ham_raise', ids: [['glute ham raise']], related: ['leg curl'], common: false },
    {
      id: 'lunge',
      ids: [
        ['lunge', 'forward lunge'],
        ['rear lunge', 'reverse lunge'],
        ['walking lunge'],
        ['side lunge', 'lateral lunge'],
      ],
    },
    { id: 'step_up', ids: [['step up']] },
    { id: 'hip_thrust', ids: [['hip thrust']] },
    { id: 'glute_bridge', ids: [['glute bridge', 'hip bridge']] },
    { id: 'glute_kickback', ids: [['glute kickback', 'donkey kick'], ['hip extension']] },
    { id: 'pull_through', ids: [['pull through', 'cable pull through']] },
    { id: 'kettlebell_swing', ids: [['kettlebell swing', 'swing']] },
    { id: 'hip_adduction', ids: [['hip adduction', 'adduction']] },
    { id: 'hip_abduction', ids: [['hip abduction', 'abduction']] },
    { id: 'monster_walk', ids: [['monster walk']], common: false },
    {
      id: 'calf_raise',
      ids: [
        ['calf raise', 'standing calf raise'],
        ['calf press'],
        ['seated calf raise'],
        ['donkey calf raise'],
      ],
    },
  ],
  core: [
    {
      id: 'crunch',
      ids: [['crunch'], ['cable crunch'], ['reverse crunch'], ['bicycle crunch'], ['decline crunch']],
      modifiers: ['oblique', 'twisting', 'tuck'],
    },
    { id: 'sit_up', ids: [['sit up', 'situp'], ['decline sit up']], modifiers: ['twisting', 'jackknife'] },
    {
      id: 'leg_raise',
      ids: [
        ['lying leg raise', 'leg raise'],
        ['hanging leg raise'],
        ['knee raise', 'hanging knee raise'],
        ['captains chair leg raise', 'vertical leg raise'],
      ],
      modifiers: ['oblique'],
    },
    { id: 'plank', ids: [['plank'], ['side plank', 'side bridge']] },
    { id: 'side_bend', ids: [['side bend']] },
    { id: 'russian_twist', ids: [['russian twist']] },
    { id: 'ab_wheel', ids: [['ab wheel rollout', 'ab wheel', 'ab rollout', 'rollout']] },
    { id: 'mountain_climber', ids: [['mountain climber']] },
    { id: 'flutter_kick', ids: [['flutter kick']] },
    { id: 'heel_touch', ids: [['heel touch', 'heel tap']] },
    { id: 'toe_touch', ids: [['toe touch']] },
    { id: 'v_up', ids: [['v up']] },
    { id: 'dead_bug', ids: [['dead bug']] },
    { id: 'pallof_press', ids: [['pallof press']] },
    { id: 'woodchopper', ids: [['woodchopper', 'wood chop', 'woodchop']] },
  ],
  fullBody: [
    { id: 'farmers_walk', ids: [['farmers walk', 'farmer walk', 'farmer carry']] },
    { id: 'turkish_get_up', ids: [['turkish get up']] },
    { id: 'windmill', ids: [['windmill']], common: false },
    { id: 'clean', ids: [['power clean'], ['hang clean'], ['clean']], common: false },
    { id: 'clean_and_press', ids: [['clean and press'], ['clean and jerk']], common: false },
    { id: 'snatch', ids: [['snatch']], common: false },
    { id: 'thruster', ids: [['thruster']], common: false },
  ],
};
const FAMILIES = Object.entries(FAMILY_REGIONS).flatMap(([region, families]) =>
  families.map((family) => ({ ...family, region })),
);

const toWords = (text) =>
  text
    .toLowerCase()
    .replace(/'/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

/** A dataset name with its spelling and encoding fixed. */
const fixName = (name) =>
  NAME_FIXES.reduce((fixed, [pattern, replacement]) => fixed.replace(pattern, replacement), name).trim();

/** The words of a name without its equipment label, which the equipment already holds. */
function nameWords(name, equipment) {
  const label = EQUIPMENT_LABELS[equipment];
  return toWords(name.replace(new RegExp(`\\s*\\(${label}\\)\\s*$`, 'i'), ''));
}

/** Every phrase of every family. */
const PHRASES = FAMILIES.flatMap((family, order) =>
  family.ids.flatMap((phrases, identity) =>
    phrases.map((phrase, rank) => ({ family, identity, rank, words: toWords(phrase), order })),
  ),
);

const mayGap = (word, family) =>
  MODIFIERS.has(word) ||
  NEUTRAL.has(word) ||
  EQUIPMENT_WORDS.has(word) ||
  (family.modifiers ?? []).includes(word);

/** Where a phrase's words fall in the name from `start`, in order, split by at most MAX_GAP modifiers. */
function locate(phrase, words, start) {
  const positions = [start];
  let gaps = 0;
  for (const word of phrase.words.slice(1)) {
    let at = positions[positions.length - 1] + 1;
    while (at < words.length && words[at] !== word) {
      if (!mayGap(words[at], phrase.family)) return null;
      gaps += 1;
      at += 1;
    }
    if (at >= words.length || gaps > MAX_GAP) return null;
    positions.push(at);
  }
  return { phrase, positions, gaps, start };
}

/** The family phrase in the words: the longest, then the least split, then the first in the name. */
function findPhrase(words) {
  let best = null;
  for (const phrase of PHRASES) {
    for (let start = 0; start < words.length; start += 1) {
      if (words[start] !== phrase.words[0]) continue;
      const found = locate(phrase, words, start);
      if (!found) continue;
      const better =
        !best ||
        phrase.words.length - best.phrase.words.length ||
        best.gaps - found.gaps ||
        best.start - found.start ||
        best.phrase.order - phrase.order;
      if (better > 0 || best === null) best = found;
    }
  }
  return best;
}

/** The words beside the movement, less any that only repeat its other names ("skull crusher"). */
function wordsOutside(words, { phrase, positions }) {
  const names = new Set(phrase.family.ids[phrase.identity].flatMap(toWords));
  return words.filter((word, index) => !positions.includes(index) && !names.has(word));
}

const modifiersOf = (words) => words.filter((word) => !NEUTRAL.has(word) && !EQUIPMENT_WORDS.has(word));

/** Where the muscle says which movement a bare "press" or "extension" is, and the words allowed beside it. */
const INFERABLE = {
  shoulders: {
    word: 'press',
    name: 'Shoulder Press',
    beside: [
      'seated',
      'standing',
      'alternating',
      'single',
      'arm',
      'palms',
      'palm',
      'in',
      'neutral',
      'kneeling',
    ],
  },
  triceps: {
    word: 'extension',
    name: 'Triceps Extension',
    beside: [
      'seated',
      'standing',
      'alternating',
      'single',
      'arm',
      'incline',
      'decline',
      'lying',
      'overhead',
      'kneeling',
    ],
  },
};

/** "Seated Press (Kettlebell)" working the shoulders is a shoulder press, and is named so. */
function nameMovement(name, exercise) {
  const rule = INFERABLE[exercise.primaryMuscle];
  if (!rule) return name;
  const words = nameWords(name, exercise.equipment);
  if (!words.includes(rule.word)) return name;
  if (!words.every((word) => word === rule.word || rule.beside.includes(word))) return name;
  return name.replace(new RegExp(`\\b${rule.word}\\b`, 'i'), rule.name);
}

/** Why a dataset record with a recognised movement is not worth keeping, or null when it is. */
function dropReason(exercise, family, outside, modifiers) {
  const muscles = REGION_MUSCLES[family.region];
  if (muscles && !muscles.includes(exercise.primaryMuscle)) return 'named for another movement than it works';
  const own = family.modifiers ?? [];
  if (findPhrase(outside.filter((word) => !own.includes(word)))) return 'two movements in one';
  const excluded = outside.filter((word) => (family.excludes ?? []).includes(word));
  if (excluded.length > 0) return `specialised (${excluded.join(' ')})`;
  const unknown = modifiers.filter((word) => !MODIFIERS.has(word) && !own.includes(word));
  if (unknown.length > 0) return `specialised (${unknown.join(' ')})`;
  if (LEG_MUSCLES.has(exercise.primaryMuscle) && modifiers.some((word) => GRIP_WORDS.has(word))) {
    return 'a naming variant (a grip on a leg exercise)';
  }
  if (modifiers.filter((word) => !PARTNER_WORDS.has(word)).length > MAX_MODIFIERS)
    return 'too many modifiers';
  return null;
}

/**
 * PURE: what one exercise is to search: its family, identity, modifiers and tier, or `drop` with the
 * reason it is not worth keeping. Built-ins are never dropped.
 */
function classify(exercise, { builtIn }) {
  const name = builtIn ? exercise.name : nameMovement(fixName(exercise.name), exercise);
  const words = nameWords(name, exercise.equipment);
  const match = findPhrase(words);
  const family = match?.phrase.family;
  const found = match
    ? { family: family.id, identity: match.phrase.identity }
    : { family: null, identity: 0 };
  const outside = match ? wordsOutside(words, match) : words;
  const modifiers = modifiersOf(outside);
  if (builtIn) return { name, ...found, modifiers, tier: 0 };

  const notLift = NOT_LIFTS.find(([pattern]) => pattern.test(name.toLowerCase()));
  if (notLift) return { name, drop: notLift[1] };
  const dropWord = outside.find((word) => DROP_WORDS.has(word));
  if (dropWord) return { name, drop: DROP_WORDS.get(dropWord) };
  if (!match) return { name, drop: 'no familiar movement' };
  const reason = dropReason(exercise, family, outside, modifiers);
  if (reason) return { name, drop: reason };
  const familiar = modifiers.length === 0 && family.common !== false;
  return {
    name,
    ...found,
    modifiers,
    tier: familiar ? 0 : 1,
    usual: match.phrase.rank === 0,
    gaps: match.gaps,
  };
}

/** Modifiers that name the same thing, so "palms in" and "neutral grip" variations are seen as one. */
const SAME_MODIFIER = { parallel: 'neutral', hammer: 'neutral', arms: 'arm', legs: 'leg' };
const PALMS = { in: 'neutral', up: 'supinated', down: 'pronated' };
const UNSPOKEN = new Set(['grip', 'in', 'with', 'on', 'bar', 'hand', 'hands', 'attachment']);

function sameModifiers(modifiers) {
  return modifiers.flatMap((word, index) => {
    if (PALMS[word] && (modifiers[index - 1] === 'palm' || modifiers[index - 1] === 'palms')) return [];
    if ((word === 'palm' || word === 'palms') && PALMS[modifiers[index + 1]])
      return [PALMS[modifiers[index + 1]]];
    return [SAME_MODIFIER[word] ?? word];
  });
}

/** Two exercises with one key are the same exercise under two names. */
const variantKey = (exercise, result) =>
  [
    result.family,
    result.identity,
    exercise.equipment,
    [...new Set(sameModifiers(result.modifiers))]
      .filter((word) => !UNSPOKEN.has(word))
      .sort()
      .join(' '),
  ].join('|');

/**
 * PURE: the curated library. Built-ins are kept in library order; then the dataset's exercises, usual and
 * plainest names first, each kept with its family and tier or dropped with a reason. An exercise sharing a kept
 * one's family, identity, equipment and modifiers is a near-duplicate: it is dropped, and its name
 * becomes an alias of the kept one so a search for it still finds that.
 */
function curate(builtIns, imported) {
  const kept = [];
  const dropped = [];
  const slots = new Map();
  const aliases = new Map();
  const keep = (exercise, result, builtIn) => {
    const key = result.family ? variantKey(exercise, result) : `id:${exercise.id}`;
    const twin = slots.get(key);
    if (twin && !builtIn) {
      dropped.push({
        ...exercise,
        newName: result.name,
        reason: `near-duplicate of ${twin.newName}`,
        twinId: twin.id,
      });
      const names = aliases.get(twin.id) ?? [];
      const known = [twin.newName, ...names].map((name) => name.toLowerCase());
      if (!known.includes(result.name.toLowerCase())) aliases.set(twin.id, [...names, result.name]);
      return;
    }
    const entry = {
      ...exercise,
      newName: result.name,
      family: result.family,
      identity: result.identity,
      modifiers: result.modifiers,
      tier: result.tier,
      builtIn,
    };
    if (!twin) slots.set(key, entry);
    kept.push(entry);
  };

  for (const exercise of builtIns) keep(exercise, classify(exercise, { builtIn: true }), true);
  const results = imported.map((exercise) => ({ exercise, result: classify(exercise, { builtIn: false }) }));
  for (const { exercise, result } of results) {
    if (result.drop) dropped.push({ ...exercise, newName: result.name, reason: result.drop });
  }
  // Familiar forms claim their slot first, then the usual name of a movement, then the plainest name,
  // then one already named so (no rename for the migration to make).
  const renamed = ({ exercise, result }) => Number(result.name !== exercise.name);
  const plainestFirst = results
    .filter(({ result }) => !result.drop)
    .sort(
      (a, b) =>
        a.result.tier - b.result.tier ||
        Number(b.result.usual) - Number(a.result.usual) ||
        a.result.gaps - b.result.gaps ||
        toWords(a.result.name).length - toWords(b.result.name).length ||
        renamed(a) - renamed(b) ||
        a.exercise.id.localeCompare(b.exercise.id),
    );
  for (const { exercise, result } of plainestFirst) keep(exercise, result, false);
  const muscles = agreedMuscles(kept);
  const withAliases = kept.map((entry) => ({ ...entry, aliases: aliases.get(entry.id) ?? [] }));
  return { kept: ranked(withAliases.map((entry) => alignMuscles(entry, muscles))), dropped };
}

/** Equipment in the order a gym is likeliest to have it: a familiar exercise's usual kit comes first. */
const EQUIPMENT_ORDER = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'band'];
const COMMON_RANK = 200;
const VARIATION_RANK = 1000;

/**
 * Each exercise's search rank, lowest first: built-ins in library order, then the dataset's familiar
 * forms by equipment, then its variations, plainest first.
 */
function ranked(kept) {
  const byEquipment = (a, b) => EQUIPMENT_ORDER.indexOf(a.equipment) - EQUIPMENT_ORDER.indexOf(b.equipment);
  const byLength = (a, b) => toWords(a.newName).length - toWords(b.newName).length;
  const byName = (a, b) => a.newName.localeCompare(b.newName);
  const common = kept
    .filter((entry) => !entry.builtIn && entry.tier === 0)
    .sort((a, b) => byEquipment(a, b) || byLength(a, b) || byName(a, b));
  const variations = kept
    .filter((entry) => !entry.builtIn && entry.tier !== 0)
    .sort((a, b) => byLength(a, b) || byEquipment(a, b) || byName(a, b));
  const ranks = new Map([
    ...kept.filter((entry) => entry.builtIn).map((entry, index) => [entry.id, index]),
    ...common.map((entry, index) => [entry.id, COMMON_RANK + index]),
    ...variations.map((entry, index) => [entry.id, VARIATION_RANK + index]),
  ]);
  return kept.map((entry) => ({ ...entry, rank: ranks.get(entry.id) }));
}

/** Each built-in movement's primary muscle, where all its built-ins agree on one. */
function agreedMuscles(kept) {
  const muscles = new Map();
  for (const entry of kept.filter((candidate) => candidate.builtIn && candidate.family)) {
    const key = `${entry.family}|${entry.identity}`;
    muscles.set(key, [...new Set([...(muscles.get(key) ?? []), entry.primaryMuscle])]);
  }
  return muscles;
}

/**
 * A dataset exercise that is a built-in's movement on other equipment works the same primary muscle, so
 * it sits under the same heading (the dataset files dumbbell squats under glutes, the library under
 * quads). Its old primary muscle joins its secondary ones.
 */
function alignMuscles(entry, muscles) {
  if (entry.builtIn || entry.tier !== 0) return entry;
  const agreed = muscles.get(`${entry.family}|${entry.identity}`);
  if (agreed?.length !== 1 || agreed[0] === entry.primaryMuscle) return entry;
  const secondary = [entry.primaryMuscle, ...entry.secondaryMuscles.filter((muscle) => muscle !== agreed[0])];
  return { ...entry, newPrimaryMuscle: agreed[0], newSecondaryMuscles: secondary };
}

/** The searches a family answers: every identity's names, then its related movements. */
function familyTerms(familyId) {
  const family = FAMILIES.find((candidate) => candidate.id === familyId);
  return family ? [...family.ids.flat(), ...(family.related ?? [])] : [];
}

module.exports = { FAMILIES, REGION_MUSCLES, classify, curate, familyTerms, fixName, nameWords, toWords };
