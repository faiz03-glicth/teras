import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { AuthIntent } from '@/features/auth/domain/types';
import { Banner, Button, ContentSwap, LogoMark, NavBar, Screen, ScreenTransition } from '@/shared/ui';

import { CodeStep } from './components/CodeStep';
import { EmailStep } from './components/EmailStep';
import { LegalFooter } from './components/LegalFooter';
import { LoginHeader } from './components/LoginHeader';
import { ProviderButtons } from './components/ProviderButtons';
import { useLoginViewModel } from './useLoginViewModel';

/**
 * One route for new and returning people; providers → email → code are in-page steps that change page like
 * Get Started does. It is the last step of Get Started: signing in (or skipping) opens the app.
 */
export function LoginScreen({ intent }: { intent: AuthIntent }) {
  const vm = useLoginViewModel(intent);
  const emailBusy = vm.busyProvider === 'email';
  const showSkip = vm.showSkip && vm.step === 'providers';

  return (
    <Screen scroll keyboard inset="wide" testID={`login-${intent}`} contentStyle={styles.content}>
      <NavBar
        onBack={vm.onBack}
        backDisabled={vm.busy}
        right={
          <ContentSwap id={showSkip ? 'skip' : 'none'}>
            {showSkip && (
              <Button
                label="Skip for now"
                variant="quiet"
                size="sm"
                onPress={vm.onSkip}
                disabled={vm.busy}
                testID="login-skip"
              />
            )}
          </ContentSwap>
        }
      />

      <View style={styles.mark}>
        <LogoMark size={76} animateIn holdable />
      </View>

      <ScreenTransition index={vm.stepIndex} style={styles.step}>
        <LoginHeader title={vm.heading.title} subtitle={vm.heading.subtitle} />
        <View style={styles.spacer} />
        {vm.banner ? <Banner message={vm.banner} testID="login-banner" /> : null}

        {vm.step === 'providers' && (
          <ProviderButtons
            showApple={vm.showApple}
            busyProvider={vm.busyProvider}
            onApple={vm.onApple}
            onGoogle={vm.onGoogle}
            onEmail={vm.onContinueWithEmail}
          />
        )}
        {vm.step === 'email' && (
          <EmailStep
            email={vm.email}
            emailValid={vm.emailValid}
            sending={emailBusy}
            onChange={vm.onEmailChange}
            onSubmit={vm.onSendCode}
          />
        )}
        {vm.step === 'code' && (
          <CodeStep
            code={vm.code}
            codeError={vm.codeError}
            verifying={emailBusy}
            resendLabel={vm.resendLabel}
            canResend={vm.canResend}
            onChange={vm.onCodeChange}
            onComplete={vm.onCodeComplete}
            onResend={vm.onResend}
            onUseDifferentEmail={vm.onUseDifferentEmail}
          />
        )}
      </ScreenTransition>

      <LegalFooter onTerms={vm.onTerms} onPrivacy={vm.onPrivacy} />
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  content: { paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.xxl, gap: theme.spacing.stack },
  // Mark → title keeps the header's own rhythm (md), inside the screen's stack gap.
  mark: { alignItems: 'center', marginBottom: theme.spacing.md - theme.spacing.stack },
  step: { flexGrow: 1, gap: theme.spacing.stack },
  spacer: { flexGrow: 1, minHeight: theme.spacing.sm },
}));
