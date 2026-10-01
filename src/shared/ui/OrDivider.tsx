import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from './Text';

export function OrDivider({ label = 'or' }: { label?: string }) {
  return (
    <View style={styles.row} accessible={false} importantForAccessibility="no-hide-descendants">
      <View style={styles.line} />
      <Text variant="mini" tone="tertiary" style={styles.label}>
        {label}
      </Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border },
  label: { fontSize: 12 },
}));
