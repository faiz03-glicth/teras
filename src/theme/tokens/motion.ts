import {
  cubicBezier,
  Easing,
  ReduceMotion,
  type WithSpringConfig,
  type WithTimingConfig,
} from 'react-native-reanimated';

/*
 * The single source of timing for the whole app. Presets (src/theme/motion) and components read these by
 * meaning; no screen writes a raw duration, curve or distance. Nothing here knows about colour: light,
 * dark and glass all move exactly the same way, only their materials differ.
 */

/**
 * The four curves of the app's motion language (cubic-bezier control points):
 * - standard: things changing or moving on screen (colour, selection, a page settling into place);
 * - emphasis: something arriving decisively (a heatmap day revealing itself);
 * - enter: things appearing (starts fast, settles softly);
 * - exit: things leaving (starts gently, speeds away).
 */
const CURVES = {
  standard: [0.2, 0, 0, 1],
  emphasis: [0.05, 0.7, 0.1, 1],
  enter: [0, 0, 0.2, 1],
  exit: [0.4, 0, 1, 1],
} as const;
export type Curve = keyof typeof CURVES;
type Points = readonly [number, number, number, number];
const curves = <T>(make: (...points: Points) => T) => ({
  standard: make(...CURVES.standard),
  emphasis: make(...CURVES.emphasis),
  enter: make(...CURVES.enter),
  exit: make(...CURVES.exit),
});
const ease = curves(Easing.bezier);

/**
 * How long things take (ms): quick for something leaving, fast for small changes (a border, a label),
 * normal for a control changing state (selection, the active step), emphasis for whole-surface changes.
 */
const DURATION = { quick: 100, fast: 140, normal: 220, emphasis: 320 } as const;

/** How far things travel (pt): a small nudge, a medium drift, a page-level arrival. */
const DISTANCE = { small: 6, medium: 12, screen: 40 } as const;

/** Gaps between staggered items (ms): tight (down a column), medium (across columns), list (list rows). */
const STAGGER = { small: 15, medium: 40, list: 70 } as const;

/** One frame at 60 Hz: the unit for "let the native side catch up" pauses. */
const FRAME = 17;

/**
 * One shared spring for presses and releases.
 * `ReduceMotion.System` makes Reanimated jump straight to the end value when Reduce Motion is on. The
 * app's own setting decides what "on" means (MotionRuntimeBridge), so it can override the phone.
 */
const spring: WithSpringConfig = { damping: 16, stiffness: 220, mass: 1, reduceMotion: ReduceMotion.System };

/** A Reanimated timing on one of the curves (`withTiming(…, motion.timing(…))`). */
const timing = (duration: number, curve: Curve = 'standard'): WithTimingConfig => ({
  duration,
  easing: ease[curve],
  reduceMotion: ReduceMotion.System,
});

export const motion = {
  duration: DURATION,
  distance: DISTANCE,
  stagger: STAGGER,
  /** The curves, for Reanimated timing animations (`withTiming(…, { easing })`) and layout keyframes. */
  ease,
  spring,
  timing,

  /**
   * pushForward / pushBack: one page of a screen replaced by the next (onboarding steps, login steps).
   * The leaving page fades out quickly; the arriving page travels in from the side it's coming from and
   * becomes visible once the old one is nearly gone (`revealAt`, % of `enterMs`), so two pages never
   * show through each other.
   */
  page: {
    enterMs: DURATION.emphasis,
    exitMs: DURATION.quick,
    revealAt: 20,
    distance: DISTANCE.screen,
  },
  /**
   * pager: pages side by side (onboarding). A swipe moves them with the finger and the platform snaps
   * to the nearest page; Continue or Back slides a whole page (`slideMs`, standard curve). A page has
   * landed once it's within `landWithin` of a page's width of its spot, finger lifted: close enough to
   * look settled, early enough for its clack to be heard as it settles (the snap's last points crawl).
   * A touch on a page waits `pressDelayMs` before it's a press: a swipe claims the touch well within that,
   * so swiping from a tile or the Welcome heatmap shows no press and fires no haptic. A tap is unaffected
   * (a release inside the delay is still a press, in and out).
   */
  pager: { slideMs: DURATION.emphasis, landWithin: 0.02, pressDelayMs: DURATION.quick },
  /**
   * datePicker: dates on a horizontal wheel, the one under the centre pointer chosen. The finger moves the
   * dates directly and the platform snaps the nearest one to the centre on release (velocity decides how
   * far a flick carries). Each date's emphasis follows its distance from the centre continuously:
   * `focusScale` at the centre easing to 1 one slot away, and dates fade toward `farOpacity` over
   * `fadeSlots` slots. A tap on another date glides it to the centre (the platform's own scroll). One tick of feedback
   * (haptic + wooden tick) per date that crosses the centre, never more often than `tickGapMs`.
   */
  datePicker: {
    slotWidth: 58,
    focusScale: 1.14,
    farOpacity: 0.45,
    fadeSlots: 3,
    tickGapMs: 35,
  },
  /**
   * scroll: a press that begins in something that scrolls waits `pressDelayMs` (Android's own tap timeout
   * in scrolling lists): a touch that turns into a scroll within that time never presses, so starting a
   * scroll on a card or a month doesn't dip it. A quick tap is still a tap (pressed and released at once).
   */
  scroll: { pressDelayMs: DURATION.quick },
  /** settle: something in a fixed frame moving to make room (a button gliding as the one below it goes). */
  settle: { durationMs: DURATION.normal },
  /** fadeUp: something appearing in place (a banner, a status line) rises a little as it fades in. */
  fadeUp: { durationMs: DURATION.normal, distance: DISTANCE.medium },
  /**
   * dayChange: a chosen day's details refreshed in place (the Day sheet, under its date wheel). The new
   * content is there at once and rises `distance` from `fromOpacity` to rest: felt, never a blank.
   */
  dayChange: { durationMs: DURATION.fast, distance: DISTANCE.small, fromOpacity: 0.6 },
  /** staggerIn: list rows rising into place one after another (the intensity levels). */
  staggerIn: { durationMs: DURATION.normal, distance: DISTANCE.small, gapMs: STAGGER.list },
  /**
   * heatmapReveal: each day fades in and grows to full size in its own colour, sweeping across the
   * columns and down the rows. Opacity and scale only: it reads the same on a light card as on a dark one.
   */
  heatmapReveal: {
    columnMs: STAGGER.medium,
    rowMs: STAGGER.small,
    durationMs: 500,
    fromScale: 0.6,
    /** Waves (the rebuild's stacking): diagonal by diagonal, top-left to bottom-right, this far apart. */
    waveStepMs: STAGGER.list,
  },
  /**
   * hold: press and hold to charge something up (the login mark). Held, it tenses (`squeeze`) and trembles
   * more and more (up to `trembleDeg`, one shiver every `tremblePeriodMs`) while haptic ticks come faster
   * and stronger (a tick every `tickGapMs.from` → `tickGapMs.to`). After `chargeMs` it lets go: it flips
   * (`flipMs`, edge-on halfway) and its blocks stack back in (heatmapRebuild's drop, clack and tick).
   * Let go early and it simply settles back.
   */
  hold: {
    chargeMs: 900,
    squeeze: 0.9,
    trembleDeg: 4,
    tremblePeriodMs: 50,
    tickGapMs: { from: 160, to: 45 },
    flipMs: 560,
    perspective: 600,
  },
  /**
   * heatmapRebuild: hold the Welcome heatmap and it collapses, then stacks itself back up. Timed to its
   * sounds (scripts/sounds/build-sounds.py builds them from these same numbers; a test keeps the
   * two in step):
   * - the collapse releases one row per impact of the falling sound (`impactsMs`, bottom row first); each
   *   row drops out of the grid (`fallMs`, `fallDistance`), tumbling a little;
   * - after `pauseMs` with an empty grid, blocks drop back into place diagonal by diagonal
   *   (heatmapReveal.waveStepMs apart), each landing at the end of its `stackMs` drop from `stackDistance`
   *   above, and every other landing (plus the last) is heard as a wooden clack and felt as a tick.
   * `audioLeadMs`: sound comes out of a phone's speaker a little after it's started, so the pictures and
   * haptics wait this long to land on the sound. The hold itself tenses less than the logo's (it's wide).
   * `handoverMs`: each phase's animation keeps holding its last frame this long after the next phase is
   * due to take over, so the hand-over always happens between two identical frames (never a flash).
   */
  heatmapRebuild: {
    impactsMs: [0, 40, 80, 156, 200, 280, 396],
    fallMs: 380,
    fallDistance: 200,
    pauseMs: 150,
    stackMs: 260,
    stackDistance: 16,
    audioLeadMs: 60,
    handoverMs: 300,
    hold: { squeeze: 0.97, trembleDeg: 1.2 },
  },
  /**
   * selection: an item's icon answers the choice: it swells a little when chosen and dips a little when
   * released (`rise`), then settles back to its resting size (`settle`). Interruptible either way.
   */
  selection: { select: 1.08, deselect: 0.94, riseMs: DURATION.quick, settleMs: DURATION.normal },
  /**
   * segmentSlide: Liquid Glass's segmented controls, whose one frosted pill glides to the chosen segment.
   * Soft and quick, with the faintest settle (damping ratio ≈ 0.8: no visible bounce); a new choice
   * mid-glide redirects it from where it is. Reduce Motion makes it a jump.
   */
  segmentSlide: {
    damping: 26,
    stiffness: 320,
    mass: 0.9,
    reduceMotion: ReduceMotion.System,
  } satisfies WithSpringConfig,
  press: { scale: 0.96, subtleScale: 0.985 },
  pulse: { scale: 1.45, durationMs: 600, repeats: 2 },
  /**
   * themeTransition: a change of theme fades through the screen's own background. A veil in the current
   * canvas colour covers the app (`coverMs`: the content fades away, nothing brightens or darkens yet),
   * the theme is swapped underneath, then the veil lifts (`revealMs`) and the new look emerges, the
   * background brightening or deepening gradually. `holdMs` gives the native theme swap two frames to land.
   */
  themeTransition: { coverMs: DURATION.quick, holdMs: 2 * FRAME, revealMs: DURATION.normal },
  /**
   * Screen transitions between routes: pushed screens slide in from the right on both platforms, tabs
   * cross-fade (calm, no sideways jump), and moving between the onboarding/login flow and the app
   * cross-fades. With Reduce Motion nothing slides: every route change cross-fades. Tabs keep their
   * cross-fade on purpose: switching the tab navigator to 'none' at runtime changes its native screen
   * container (iOS), remounting every tab and blanking pages. `fadeMs` sets iOS cross-fades (whose
   * platform default, 500ms, drags).
   */
  navigation: {
    full: { push: 'ios_from_right', groupSwitch: 'fade', tabs: 'fade' },
    reduced: { push: 'fade', groupSwitch: 'fade', tabs: 'fade' },
    fadeMs: DURATION.emphasis,
  },
  /**
   * The liquid tab bar: ONE liquid body with a leading head and a trailing tail. The head springs to the
   * new tab (a slight overshoot reads as the liquid compressing on arrival); the tail follows a little
   * behind, so the body stretches while it travels and gathers back into one pill when it stops. Nothing
   * loops: once both springs settle the bar is completely still.
   */
  liquid: {
    head: {
      damping: 22,
      stiffness: 300,
      mass: 0.8,
      reduceMotion: ReduceMotion.System,
    } satisfies WithSpringConfig,
    tail: {
      damping: 22,
      stiffness: 180,
      mass: 0.9,
      reduceMotion: ReduceMotion.System,
    } satisfies WithSpringConfig,
    /** While dragging: the head follows the finger closely (smoothed, never teleporting); the tail still lags. */
    dragHead: {
      damping: 24,
      stiffness: 420,
      mass: 0.6,
      reduceMotion: ReduceMotion.System,
    } satisfies WithSpringConfig,
    dragTail: {
      damping: 22,
      stiffness: 240,
      mass: 0.8,
      reduceMotion: ReduceMotion.System,
    } satisfies WithSpringConfig,
    /** How a finger on the bar "engages" the liquid (drives magnification while dragging). */
    engage: {
      damping: 20,
      stiffness: 220,
      mass: 1,
      reduceMotion: ReduceMotion.System,
    } satisfies WithSpringConfig,
    /**
     * Shape, in units of the distance between neighbouring tabs:
     * - `maxReach`: the tail is drawn at most this far behind the head, so on long jumps the body travels
     *   as one stretched drop and the old tab never keeps a second, "ghost" bubble;
     * - at full stretch each end shrinks a little (`headShrink`, `tailShrink`) and the neck thins to
     *   `1 - neckThin` of the height: thick enough to always read as one connected body.
     */
    shape: { maxReach: 0.8, headShrink: 0.06, tailShrink: 0.2, neckThin: 0.28 },
    /**
     * Icon magnification, by distance to the liquid (1 tab-spacing away = none): `peak` scale boost while
     * the liquid moves or is dragged, `rest` for the selected icon once still, and a small lift in points.
     * Sized so a magnified icon always stays inside the liquid's 7pt padding, even mid-stretch.
     * With the 1.3 falloff: 0% → 1.12×, 25% → 1.08×, 50% → 1.05×, 75% → 1.02×, 100% → 1.00×.
     */
    magnify: { peak: 0.12, rest: 0.04, liftPt: 1, falloffPower: 1.3, stretchGain: 2.5 },
    /** The footer's widest stretch toward the liquid's destination, as a fraction of its width. */
    footerStretch: 0.03,
    /** Reduce Motion: the liquid jumps, then fades in at the new tab (opacity only, so always played). */
    fade: { duration: 160, reduceMotion: ReduceMotion.Never } satisfies WithTimingConfig,
    /**
     * The + button: squashes wide and flat while held, then wobbles back like a droplet (the loose
     * release spring briefly overshoots into a tall, narrow stretch before settling).
     */
    press: {
      squashX: 1.1,
      squashY: 0.88,
      hold: {
        damping: 14,
        stiffness: 420,
        mass: 0.6,
        reduceMotion: ReduceMotion.System,
      } satisfies WithSpringConfig,
      release: {
        damping: 7,
        stiffness: 260,
        mass: 0.7,
        reduceMotion: ReduceMotion.System,
      } satisfies WithSpringConfig,
    },
  },
} as const;

/**
 * The same curves for Reanimated CSS animations and transitions (`animationTimingFunction`,
 * `transitionTimingFunction`). Kept OUT of `motion` on purpose: these are class instances, which can't be
 * copied to the UI thread, and worklets capture parts of `motion` (everything inside it must stay plain
 * data; see motion.test).
 */
export const cssEase = curves(cubicBezier);
