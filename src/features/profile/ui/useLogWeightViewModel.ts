import { useCallback, useMemo, useState } from 'react';

import {
  bodyweightFields,
  formatWeight,
  parseBodyweightKg,
  stepBodyweightKg,
  type StepDirection,
} from '@/features/training/domain/preferences';
import { useLogBodyweight } from '@/features/training/hooks/useLogBodyweight';
import { useTrainingPreferencesStore } from '@/features/training/state/trainingPreferencesStore';
import { useWorkoutOwner } from '@/features/workouts/hooks/useWorkoutQueries';
import { goBack } from '@/shared/actions';
import { haptics } from '@/shared/lib/haptics';
import { useToday } from '@/shared/lib/date/useToday';
import { showInfo, showSuccess } from '@/shared/ui/toast';

/**
 * Log weight: today's weigh-in. It starts from the bodyweight now in use and changes nothing until Save,
 * which keeps the weigh-in and makes it the bodyweight workouts use from here on.
 */
export function useLogWeightViewModel() {
  const unit = useTrainingPreferencesStore((s) => s.unit);
  const current = useTrainingPreferencesStore((s) => s.bodyweightKg);
  const setBodyweightKg = useTrainingPreferencesStore((s) => s.setBodyweightKg);
  const owner = useWorkoutOwner();
  const today = useToday();
  const log = useLogBodyweight(owner);
  const [kg, setKg] = useState(current);

  const onStep = useCallback(
    (direction: StepDirection) => {
      haptics.selection();
      setKg((from) => stepBodyweightKg(from, direction, unit));
    },
    [unit],
  );

  // A typed value replaces the draft only when it reads as a number (and says so); a slip changes nothing.
  const onType = useCallback(
    (parts: readonly string[]) => {
      const typed = parseBodyweightKg(parts[0] ?? '', unit);
      if (typed !== null) setKg(typed);
      return typed !== null;
    },
    [unit],
  );

  const input = useMemo(() => bodyweightFields(kg, unit), [kg, unit]);

  const onSave = async () => {
    if (log.isPending) return;
    try {
      await log.mutateAsync({ date: today, weightKg: kg });
    } catch (cause) {
      console.error(`[profile] Could not log weight (${cause instanceof Error ? cause.name : 'unknown'})`); // TODO(Sentry)
      showInfo({ title: "Couldn't log weight", sub: 'Try again.' });
      return;
    }
    setBodyweightKg(kg);
    haptics.success();
    showSuccess({ title: 'Weight logged', sub: formatWeight(kg, unit) });
    goBack();
  };

  return {
    value: formatWeight(kg, unit),
    input,
    saving: log.isPending,
    onStep,
    onType,
    onSave,
    onClose: () => goBack(),
  };
}
