import { ActivityIndicator, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Button, OtpInput, Text } from '@/shared/ui';
import { layoutMotion } from '@/theme';

interface CodeStepProps {
  code: string;
  codeError: string | null;
  verifying: boolean;
  resendLabel: string;
  canResend: boolean;
  onChange: (code: string) => void;
  onComplete: (code: string) => void;
  onResend: () => void;
  onUseDifferentEmail: () => void;
}

export function CodeStep({
  code,
  codeError,
  verifying,
  resendLabel,
  canResend,
  onChange,
  onComplete,
  onResend,
  onUseDifferentEmail,
}: CodeStepProps) {
  const { theme } = useUnistyles();
  return (
    <View style={styles.stack}>
      <OtpInput
        value={code}
        onChangeText={onChange}
        onComplete={onComplete}
        error={codeError}
        disabled={verifying}
        autoFocus
      />
      {verifying && (
        <Animated.View
          entering={layoutMotion.fadeUp}
          exiting={layoutMotion.fade.out}
          style={styles.verifying}
          accessibilityLiveRegion="polite"
        >
          <ActivityIndicator size="small" color={theme.colors.text2} />
          <Text variant="footnote" tone="secondary">
            Verifying…
          </Text>
        </Animated.View>
      )}
      <Button
        label={resendLabel}
        variant="ghost"
        onPress={onResend}
        disabled={!canResend}
        testID="login-resend"
      />
      <Button
        label="Use a different email"
        variant="quiet"
        onPress={onUseDifferentEmail}
        disabled={verifying}
        testID="login-different-email"
      />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  stack: { gap: theme.spacing.sm },
  verifying: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm },
}));
