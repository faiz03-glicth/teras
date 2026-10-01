import { StyleSheet } from 'react-native-unistyles';

import { Text } from '@/shared/ui';

export function LegalFooter({ onTerms, onPrivacy }: { onTerms: () => void; onPrivacy: () => void }) {
  return (
    <Text variant="mini" tone="tertiary" align="center" style={styles.footer}>
      By continuing, you agree to Teras&apos;s{' '}
      <Text variant="mini" tone="secondary" style={styles.link} onPress={onTerms} accessibilityRole="link">
        Terms
      </Text>{' '}
      and{' '}
      <Text variant="mini" tone="secondary" style={styles.link} onPress={onPrivacy} accessibilityRole="link">
        Privacy Policy
      </Text>
      .
    </Text>
  );
}

const styles = StyleSheet.create({
  footer: { lineHeight: 17 },
  link: { textDecorationLine: 'underline' },
});
