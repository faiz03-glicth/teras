import { MUSCLE_GROUP_LABELS, MUSCLE_GROUPS, type MuscleGroup } from './muscleGroups';

/** The radar's drawing box and web, as the mockup's Muscle balance board has them. */
export const RADAR_WIDTH = 326;
export const RADAR_HEIGHT = 300;
const CENTER_X = 163;
const CENTER_Y = 150;
const RADIUS = 100;
/** A label sits this far past the outer ring, its middle on the axis. */
const LABEL_RADIUS = RADIUS + 20;
/** Half a label's line, so its middle (not its top) sits on the axis. */
const LABEL_HALF_LINE = 8;
/** The three rings, as fractions of the full radius. */
const RING_FRACTIONS = [1 / 3, 2 / 3, 1] as const;
/** The web never shrinks below this many sets, so a first week doesn't fill it. */
const MIN_SCALE = 12;
/** The web grows in steps of this many sets, so each ring is a whole number (a third of the scale). */
const SCALE_STEP = 6;

/** The axis of the k-th group: the first points straight up, the rest follow clockwise. */
const angleOf = (k: number): number => -Math.PI / 2 + (k * 2 * Math.PI) / MUSCLE_GROUPS.length;

const pointAt = (k: number, radius: number): readonly [number, number] => [
  CENTER_X + radius * Math.cos(angleOf(k)),
  CENTER_Y + radius * Math.sin(angleOf(k)),
];

const text = ([x, y]: readonly [number, number]): string => `${x.toFixed(1)},${y.toFixed(1)}`;

/** The three rings as Polygon `points`, inner to outer. They never change, so they are built once. */
export const RADAR_RINGS: readonly string[] = RING_FRACTIONS.map((fraction) =>
  MUSCLE_GROUPS.map((_, k) => text(pointAt(k, RADIUS * fraction))).join(' '),
);

/** Every axis, from the middle to the outer ring, as one Path `d`. */
export const RADAR_AXES: string = MUSCLE_GROUPS.map((_, k) => {
  const [x, y] = pointAt(k, RADIUS);
  return `M${CENTER_X},${CENTER_Y} L${x.toFixed(1)},${y.toFixed(1)}`;
}).join(' ');

export interface RadarLabel {
  group: MuscleGroup;
  label: string;
  /** The label's middle, as a share of the drawing's width (0 to 1). */
  x: number;
  /** The label's top, as a share of the drawing's height (0 to 1). */
  y: number;
}

/** Where each group's name goes, as shares of the box so it follows the drawing when it is scaled. */
export const RADAR_LABELS: readonly RadarLabel[] = MUSCLE_GROUPS.map((group, k) => {
  const [x, y] = pointAt(k, LABEL_RADIUS);
  return {
    group,
    label: MUSCLE_GROUP_LABELS[group],
    x: Math.round(x) / RADAR_WIDTH,
    y: Math.round(y - LABEL_HALF_LINE) / RADAR_HEIGHT,
  };
});

/**
 * PURE: the number of sets the outer ring stands for: the most of any group in either period, rounded up to
 * a step, and never less than the minimum.
 */
export function radarScale(...periods: readonly Record<MuscleGroup, number>[]): number {
  const most = Math.max(0, ...periods.flatMap((period) => MUSCLE_GROUPS.map((group) => period[group])));
  return Math.max(MIN_SCALE, Math.ceil(most / SCALE_STEP) * SCALE_STEP);
}

/** PURE: a shape's Polygon `points`: each group's sets as a share of the scale, along its axis. */
export function radarPoints(values: Record<MuscleGroup, number>, scale: number): string {
  return MUSCLE_GROUPS.map((group, k) => text(pointAt(k, RADIUS * Math.min(1, values[group] / scale)))).join(
    ' ',
  );
}
