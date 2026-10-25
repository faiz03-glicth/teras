import { countSets } from '@/features/workouts/domain/labels';

import type { ShareModel } from './shareModel';

/**
 * PURE: the plain-text version of the picture, for a message or a note:
 *
 *     Push Day · Fri, 9 Oct
 *     58 min · 6,420 kg · 18 sets
 *
 *     Barbell Bench Press: 4 sets, best 82.5 kg × 6 (new record)
 *
 *     Logged with Teras
 */
export function copyText(model: ShareModel): string {
  const lifts = model.lifts.map(
    (lift) => `${lift.name}: ${countSets(lift.sets)}, best ${lift.best}${lift.record ? ' (new record)' : ''}`,
  );
  return [
    `${model.title} · ${model.dateLabel}`,
    model.stats.map((stat) => `${stat.value} ${stat.unit}`).join(' · '),
    '',
    ...(lifts.length > 0 ? [...lifts, ''] : []),
    'Logged with Teras',
  ].join('\n');
}
