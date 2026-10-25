import { useLocalSearchParams } from 'expo-router';

import { ShareSheet } from '@/features/share/ui/ShareSheet';
import { parseRecordId } from '@/shared/actions/params';

/** Form sheet over a finished workout: share it as a picture (Story-sized) or as text. */
export default function ShareRoute() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  return <ShareSheet id={parseRecordId(workoutId)} />;
}
