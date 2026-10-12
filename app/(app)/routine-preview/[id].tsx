import { useLocalSearchParams } from 'expo-router';

import { RoutinePreviewScreen } from '@/features/workouts/ui/RoutinePreviewScreen';
import { parseRecordId } from '@/shared/actions/params';

/** A routine before it starts, from its card on the Workout tab: what to beat from last week, then Start. */
export default function RoutinePreviewRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RoutinePreviewScreen id={parseRecordId(id)} />;
}
