import { useCallback, useRef, useState } from 'react';

import { EQUIPMENT, MUSCLES, type Equipment, type Muscle } from '@/core/db/schema';
import { EQUIPMENT_LABELS, MUSCLE_LABELS } from '@/features/exercises/domain/labels';
import { useWorkoutOwner } from '@/features/workouts/hooks/useWorkoutQueries';
import { goBack } from '@/shared/actions';
import { haptics } from '@/shared/lib/haptics';
import { showInfo, showSuccess } from '@/shared/ui/toast';

import { useCreateExercise } from '../hooks/useExerciseQueries';
import { useExerciseBrowserStore } from '../state/exerciseBrowserStore';

const EQUIPMENT_OPTIONS = EQUIPMENT.map((value) => ({ value, label: EQUIPMENT_LABELS[value] }));
const MUSCLE_OPTIONS = MUSCLES.map((value) => ({ value, label: MUSCLE_LABELS[value] }));

/**
 * Create exercise: a name, its equipment and its main muscle, as the prototype asks. The name starts as
 * whatever was being searched for, since that is usually the exercise that wasn't found. Once created,
 * the browser behind shows it.
 */
export function useCreateExerciseViewModel() {
  const owner = useWorkoutOwner();
  const showCreated = useExerciseBrowserStore((state) => state.showCreated);
  const { mutateAsync, isPending } = useCreateExercise(owner);
  // Read once: the search it starts from, not one that changes underneath it.
  const [name, setName] = useState(() => useExerciseBrowserStore.getState().query.trim());
  const [equipment, setEquipment] = useState<Equipment>('barbell');
  const [muscle, setMuscle] = useState<Muscle>('chest');
  const [error, setError] = useState<string | null>(null);
  const creating = useRef(false);

  const create = useCallback(async () => {
    if (creating.current) return;
    creating.current = true;
    try {
      const result = await mutateAsync({ name, equipment, primaryMuscle: muscle });
      if (!result.ok) {
        haptics.warning();
        setError(result.reason);
        return;
      }
      haptics.success();
      showCreated(result.exercise.name);
      goBack();
      showSuccess({ title: `${result.exercise.name} created` });
    } catch (cause) {
      console.error(
        `[exercises] Could not create an exercise (${cause instanceof Error ? cause.name : 'unknown'})`,
      ); // TODO(Sentry)
      showInfo({ title: "Couldn't create exercise", sub: 'Try again.' });
    } finally {
      creating.current = false;
    }
  }, [equipment, muscle, mutateAsync, name, showCreated]);

  return {
    name,
    error,
    busy: isPending,
    equipment,
    equipmentOptions: EQUIPMENT_OPTIONS,
    muscle,
    muscleOptions: MUSCLE_OPTIONS,
    onNameChange: useCallback((text: string) => {
      setName(text);
      setError(null);
    }, []),
    onEquipmentChange: setEquipment,
    onMuscleChange: setMuscle,
    onCreate: () => void create(),
    onClose: () => goBack(),
  };
}
