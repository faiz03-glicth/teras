import { useLocalSearchParams } from 'expo-router';

import { AddExerciseScreen } from '@/features/workouts/ui/AddExerciseScreen';
import { parseAddExerciseTarget } from '@/shared/actions/params';

/** The exercise library, adding to the workout in progress, or (target=routine) to the routine being edited. */
export default function AddExerciseRoute() {
  const { target } = useLocalSearchParams<{ target?: string }>();
  return <AddExerciseScreen target={parseAddExerciseTarget(target)} />;
}
