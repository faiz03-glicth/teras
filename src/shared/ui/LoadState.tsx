import { ActivityIndicator, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Button } from './Button';
import { Icon } from './Icon';
import { Text } from './Text';

/** Content on its way: a quiet spinner where it will land, never a blank space. */
export function LoadingState({ label, testID }: { label: string; testID?: string }) {
  const { theme } = useUnistyles();
  return (
    <View
      style={styles.root}
      accessible
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      testID={testID}
    >
      <ActivityIndicator color={theme.colors.text3} />
    </View>
  );
}

export interface ErrorStateProps {
  /** What failed, in a few words: "Couldn't load workouts". */
  title: string;
  onRetry: () => void;
  testID?: string;
}

/** Something could not be read: say so briefly and offer the one useful thing, trying again. */
export function ErrorState({ title, onRetry, testID }: ErrorStateProps) {
  const { theme } = useUnistyles();
  return (
    <View style={styles.root} testID={testID}>
      <View style={styles.message} accessible accessibilityRole="alert" accessibilityLabel={title}>
        <Icon name="alert" size={22} color={theme.colors.danger} />
        <Text variant="headline" align="center">
          {title}
        </Text>
      </View>
      <View style={styles.action}>
        <Button
          label="Retry"
          variant="secondary"
          size="sm"
          onPress={onRetry}
          testID={testID && `${testID}-retry`}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: { alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.xl },
  message: { alignItems: 'center', gap: theme.spacing.sm },
  action: { alignSelf: 'center' },
}));
