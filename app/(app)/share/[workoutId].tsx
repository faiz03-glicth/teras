import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-unistyles';

import { ShareSheet } from '@/features/share/ui/ShareSheet';
import { parseRecordId } from '@/shared/actions/params';

/**
 * A full page over a finished workout: share it as a picture (Story-sized) or as text. It is not a form
 * sheet, because its content scrolls and a sheet closed when pulled back down past the top.
 */
export default function ShareRoute() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.root}>
      <ShareSheet id={parseRecordId(workoutId)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
