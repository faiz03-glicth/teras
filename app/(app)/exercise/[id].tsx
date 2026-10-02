import { useLocalSearchParams } from 'expo-router';

import { ExerciseDetailScreen } from '@/features/exercises/ui/ExerciseDetailScreen';
import { parseRecordId } from '@/shared/actions/params';

/** One exercise: its muscles, records and history (from the library, the picker's ⓘ or "More for"). */
export default function ExerciseRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ExerciseDetailScreen id={parseRecordId(id)} />;
}
