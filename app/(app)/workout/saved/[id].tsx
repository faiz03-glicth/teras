import { useLocalSearchParams } from 'expo-router';

import { WorkoutSavedScreen } from '@/features/workouts/ui/WorkoutSavedScreen';
import { parseRecordId } from '@/shared/actions/params';

/** What a just-finished workout came to (it takes the finished workout's place). */
export default function WorkoutSavedRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <WorkoutSavedScreen id={parseRecordId(id)} />;
}
