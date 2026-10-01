import { View, type StyleProp, type ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from '@/shared/ui';

export function StepHeading({
  title,
  body,
  style,
}: {
  title: string;
  body: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.heading, style]}>
      <Text variant="display" accessibilityRole="header">
        {title}
      </Text>
      <Text variant="lead" tone="secondary">
        {body}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { gap: 10 },
});
