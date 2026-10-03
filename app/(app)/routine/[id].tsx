import { useLocalSearchParams } from 'expo-router';

import { EditRoutineScreen } from '@/features/routines/ui/EditRoutineScreen';
import { parseRecordId } from '@/shared/actions/params';

/** Edit routine, from the Workout tab ("new" for a new one). */
export default function RoutineRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EditRoutineScreen routineId={parseRecordId(id)} />;
}
