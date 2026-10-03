import { formatVolume, type WeightUnit } from '@/features/training/domain/preferences';
import type { DayStanding } from '@/features/workoutDays/domain/heatLevel';
import { countSets } from '@/features/workouts/domain/labels';

/**
 * PURE: the line under a day's level: the facts it was judged by, in a few words. A workout still running
 * is not counted until it is finished, and the line says so rather than calling today a rest day.
 */
export function standingLine(
  standing: DayStanding,
  unit: WeightUnit,
  context: { today: boolean; running: boolean },
): string {
  switch (standing.kind) {
    case 'rest':
      return context.running ? 'Counts when you finish' : context.today ? 'Nothing logged yet' : 'Rest day';
    case 'unweighted':
      return `${countSets(standing.sets)} · no weight lifted`;
    case 'early':
      return `${formatVolume(standing.volumeKg, unit)} · too early to compare`;
    case 'compared':
      return `${formatVolume(standing.volumeKg, unit)} · your 90-day median is ${formatVolume(standing.medianKg, unit)}`;
  }
}
