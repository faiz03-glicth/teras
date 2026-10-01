import { Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

interface BootErrorScreenProps {
  title: string;
  detail: string;
}

/**
 * Shown instead of the app when boot fails (bad config, failed migration).
 * Uses system fonts on purpose: custom fonts may be the thing that failed.
 */
export function BootErrorScreen({ title, detail }: BootErrorScreenProps) {
  return (
    <View style={styles.root} accessibilityRole="alert">
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.detail} selectable>
        {detail}
      </Text>
      <Text style={styles.hint}>Close and reopen Teras. If this keeps happening, reinstall the app.</Text>
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  root: {
    flex: 1,
    justifyContent: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.xxl,
    paddingTop: rt.insets.top,
    paddingBottom: rt.insets.bottom,
    backgroundColor: theme.colors.canvas,
  },
  title: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  detail: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.danger,
    backgroundColor: theme.colors.dangerSoft,
    padding: theme.spacing.md,
    borderRadius: theme.radii.control,
    overflow: 'hidden',
  },
  hint: { fontSize: 14, lineHeight: 20, color: theme.colors.text2 },
}));
