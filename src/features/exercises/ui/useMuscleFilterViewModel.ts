import { useCallback, useMemo } from 'react';

import { MUSCLES, type Muscle } from '@/core/db/schema';
import { muscleOfRegion, type Highlight } from '@/features/exercises/domain/bodyMap';
import { MUSCLE_LABELS } from '@/features/exercises/domain/labels';
import { goBack } from '@/shared/actions';
import { haptics } from '@/shared/lib/haptics';

import { useExerciseBrowserStore } from '../state/exerciseBrowserStore';

export type MuscleChoice = Muscle | 'all';

const OPTIONS: readonly { value: MuscleChoice; label: string }[] = [
  { value: 'all', label: 'All muscles' },
  ...MUSCLES.map((muscle) => ({ value: muscle, label: MUSCLE_LABELS[muscle] })),
];

const NO_HIGHLIGHT: Highlight = { primary: [], secondary: [] };

/** The muscle filter: a muscle tapped on the body or picked from the list narrows the browser, then closes. */
export function useMuscleFilterViewModel() {
  const muscle = useExerciseBrowserStore((state) => state.muscle);
  const setMuscle = useExerciseBrowserStore((state) => state.setMuscle);

  const pick = useCallback(
    (next: Muscle | null) => {
      haptics.selection();
      setMuscle(next);
      goBack();
    },
    [setMuscle],
  );

  return {
    value: muscle ?? ('all' as MuscleChoice),
    options: OPTIONS,
    highlight: useMemo(() => (muscle ? { primary: [muscle], secondary: [] } : NO_HIGHLIGHT), [muscle]),
    onPick: useCallback((value: MuscleChoice) => pick(value === 'all' ? null : value), [pick]),
    onRegion: useCallback(
      (region: string) => {
        const tapped = muscleOfRegion(region);
        if (tapped) pick(tapped);
      },
      [pick],
    ),
    onClose: () => goBack(),
  };
}
