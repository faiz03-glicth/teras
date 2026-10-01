import { StyleSheet } from 'react-native-unistyles';

import { Text } from './Text';

/** An uppercase group title above a card of rows ("ACCOUNT", "PREFERENCES"). */
export function SectionLabel({ children }: { children: string }) {
  return (
    <Text variant="caption" tone="tertiary" weight="semibold" style={styles.label} accessibilityRole="header">
      {children.toUpperCase()}
    </Text>
  );
}

const styles = StyleSheet.create((theme) => ({
  label: { paddingHorizontal: theme.spacing.xs, letterSpacing: 0.5, marginBottom: -6 },
}));
