import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { AuthProvider } from '@/features/auth/domain/types';
import { Button, OrDivider, SsoButton } from '@/shared/ui';

interface ProviderButtonsProps {
  showApple: boolean;
  busyProvider: AuthProvider | null;
  onApple: () => void;
  onGoogle: () => void;
  onEmail: () => void;
}

/** Apple (iOS only) and Google first, then email. While one sign-in runs, every other option is disabled. */
export function ProviderButtons({
  showApple,
  busyProvider,
  onApple,
  onGoogle,
  onEmail,
}: ProviderButtonsProps) {
  const busy = busyProvider !== null;
  return (
    <View style={styles.stack}>
      {showApple && (
        <SsoButton
          provider="apple"
          onPress={onApple}
          busy={busyProvider === 'apple'}
          disabled={busy && busyProvider !== 'apple'}
        />
      )}
      <SsoButton
        provider="google"
        onPress={onGoogle}
        busy={busyProvider === 'google'}
        disabled={busy && busyProvider !== 'google'}
      />
      <OrDivider />
      <Button
        label="Continue with email"
        variant="ghost"
        icon="mail"
        onPress={onEmail}
        disabled={busy}
        testID="login-continue-email"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 10 },
});
