import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from '@/shared/ui';

/** The step's title and subtitle. The logo mark sits above it, outside the step (it never changes). */
export function LoginHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.header}>
      <Text variant="title" align="center" accessibilityRole="header">
        {title}
      </Text>
      <Text variant="lead" tone="secondary" align="center" style={styles.subtitle}>
        {subtitle}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  header: { alignItems: 'center', gap: theme.spacing.md },
  subtitle: { maxWidth: 300 },
}));
