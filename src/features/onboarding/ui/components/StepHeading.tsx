import { View, type StyleProp, type ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from '@/shared/ui';

export function StepHeading({
  title,
  body,
  style,
}: {
  title: string;
  /** A line under the title, only when the title cannot carry the step alone. */
  body?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.heading, style]}>
      <Text variant="display" accessibilityRole="header">
        {title}
      </Text>
      {body ? (
        <Text variant="lead" tone="secondary">
          {body}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { gap: 10 },
});
