import { useCallback, useMemo, useState } from 'react';

import { MUSCLES, type Muscle } from '@/core/db/schema';
import { muscleOfRegion, type Highlight } from '@/features/exercises/domain/bodyMap';
import { MUSCLE_LABELS } from '@/features/exercises/domain/labels';
import { haptics } from '@/shared/lib/haptics';

import { useExerciseBrowserStore } from '../state/exerciseBrowserStore';

export type MuscleChoice = Muscle | 'all';

const OPTIONS: readonly { value: MuscleChoice; label: string }[] = [
  { value: 'all', label: 'All muscles' },
  ...MUSCLES.map((muscle) => ({ value: muscle, label: MUSCLE_LABELS[muscle] })),
];

const NO_HIGHLIGHT: Highlight = { primary: [], secondary: [] };

/**
 * The muscle filter, opened in the browser itself: the body with the chosen muscle lit, every muscle as a
 * choice beneath it. A muscle tapped on the body or picked from the list narrows the list below at once,
 * and the body stays, so the next muscle is one tap away. Closed each time the browser opens.
 */
export function useMuscleFilter() {
  const [open, setOpen] = useState(false);
  const muscle = useExerciseBrowserStore((state) => state.muscle);
  const setMuscle = useExerciseBrowserStore((state) => state.setMuscle);

  const pick = useCallback(
    (next: Muscle | null) => {
      haptics.selection();
      setMuscle(next);
    },
    [setMuscle],
  );

  return {
    open,
    value: muscle ?? ('all' as MuscleChoice),
    options: OPTIONS,
    highlight: useMemo(() => (muscle ? { primary: [muscle], secondary: [] } : NO_HIGHLIGHT), [muscle]),
    onToggle: useCallback(() => setOpen((wasOpen) => !wasOpen), []),
    onPick: useCallback((value: MuscleChoice) => pick(value === 'all' ? null : value), [pick]),
    // Reads the muscle at tap time, so the drawing (which never changes) is not redrawn on every pick.
    onRegion: useCallback(
      (region: string) => {
        const tapped = muscleOfRegion(region);
        if (tapped && tapped !== useExerciseBrowserStore.getState().muscle) pick(tapped);
      },
      [pick],
    ),
  };
}

export type MuscleFilterModel = ReturnType<typeof useMuscleFilter>;
