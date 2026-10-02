import { useLocalSearchParams } from 'expo-router';

import { SessionScreen } from '@/features/workouts/ui/SessionScreen';
import { parseRecordId } from '@/shared/actions/params';

/** A logged workout, exactly as it was recorded (from the feed, the Calendar or a day's sheet). */
export default function SessionRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SessionScreen id={parseRecordId(id)} />;
}
