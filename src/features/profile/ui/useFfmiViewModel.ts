import { ffmiOf, formatIndex } from '@/features/training/domain/body';
import { formatWeight, type StepDirection } from '@/features/training/domain/preferences';
import { useTrainingPreferencesStore } from '@/features/training/state/trainingPreferencesStore';
import { goBack } from '@/shared/actions';
import { haptics } from '@/shared/lib/haptics';

/**
 * FFMI: how much lean mass is carried for the height, worked out from the bodyweight and a body-fat
 * figure that is asked for here and kept. An estimate, and said to be.
 */
export function useFfmiViewModel() {
  const unit = useTrainingPreferencesStore((s) => s.unit);
  const bodyweightKg = useTrainingPreferencesStore((s) => s.bodyweightKg);
  const heightCm = useTrainingPreferencesStore((s) => s.heightCm);
  const bodyFatPercent = useTrainingPreferencesStore((s) => s.bodyFatPercent);
  const stepBodyFat = useTrainingPreferencesStore((s) => s.stepBodyFat);
  const { value, leanKg } = ffmiOf(bodyweightKg, heightCm, bodyFatPercent);

  return {
    bodyFat: `${bodyFatPercent} %`,
    ffmi: formatIndex(value),
    leanMass: formatWeight(leanKg, unit),
    onStepBodyFat: (direction: StepDirection) => {
      haptics.selection();
      stepBodyFat(direction);
    },
    onClose: () => goBack(),
  };
}
