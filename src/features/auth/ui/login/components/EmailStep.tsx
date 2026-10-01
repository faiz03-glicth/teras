import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Button, TextField } from '@/shared/ui';

interface EmailStepProps {
  email: string;
  emailValid: boolean;
  sending: boolean;
  onChange: (email: string) => void;
  onSubmit: () => void;
}

export function EmailStep({ email, emailValid, sending, onChange, onSubmit }: EmailStepProps) {
  return (
    <View style={styles.stack}>
      <TextField
        testID="login-email-input"
        label="Email address"
        icon="mail"
        value={email}
        onChangeText={onChange}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
        returnKeyType="send"
        onSubmitEditing={onSubmit}
        editable={!sending}
      />
      <Button
        label="Send code"
        loading={sending}
        loadingLabel="Sending…"
        disabled={!emailValid}
        onPress={onSubmit}
        testID="login-send-code"
      />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  stack: { gap: theme.spacing.md },
}));
