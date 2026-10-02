import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { useRepositories } from '@/core/DiProvider';
import { goBack, openLegal, openOnboarding } from '@/shared/actions';
import { formatDuration } from '@/shared/lib/format/formatDuration';
import { useCountdown } from '@/shared/lib/useCountdown';

import { LOGIN_STEPS, loginHeading, RESEND_COOLDOWN_SECONDS, type LoginStep } from '../../config/loginCopy';
import { isValidEmail, normalizeEmail } from '../../domain/email';
import type { AuthIntent } from '../../domain/types';
import { useAuthMutations } from '../../hooks/useAuthMutations';
import { useAuthStore } from '../../state/authStore';
import { useSignInAttempt } from './useSignInAttempt';

export function useLoginViewModel(intent: AuthIntent) {
  const { auth } = useRepositories();
  const mutations = useAuthMutations();
  const pendingProvider = useAuthStore((s) => s.pendingProvider);
  const setIntent = useAuthStore((s) => s.setIntent);
  const { feedback, attempt, request, clearCodeError, clearFeedback } = useSignInAttempt();
  const cooldown = useCountdown();
  const [step, setStep] = useState<LoginStep>('providers');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');

  const appleAvailable = useQuery({
    queryKey: ['auth', 'apple-available'],
    queryFn: () => auth.isAppleAvailable(),
    staleTime: Infinity,
    networkMode: 'always',
  });

  useEffect(() => {
    setIntent(intent);
    return () => setIntent(null);
  }, [intent, setIntent]);

  const busy = pendingProvider !== null;
  const address = normalizeEmail(email);

  const sendCode = async () => {
    if (busy || !isValidEmail(email)) return;
    if (await request(() => mutations.requestOtp.mutateAsync(address))) {
      setCode('');
      setStep('code');
      cooldown.start(RESEND_COOLDOWN_SECONDS);
    }
  };

  return {
    step,
    /** The step's place in the flow; the page transition's direction follows from it. */
    stepIndex: LOGIN_STEPS.indexOf(step),
    heading: loginHeading(step, intent, address),
    showSkip: intent === 'new',
    showApple: appleAvailable.data === true,
    busy,
    busyProvider: pendingProvider,
    banner: feedback.banner,
    email,
    emailValid: isValidEmail(email),
    code,
    codeError: feedback.codeError,
    resendLabel: cooldown.active ? `Resend code (${formatDuration(cooldown.remaining)})` : 'Resend code',
    canResend: !cooldown.active && !busy,

    onBack: () => {
      if (busy) return;
      clearFeedback();
      if (step === 'code') setStep('email');
      else if (step === 'email') setStep('providers');
      else goBack(() => openOnboarding(0, { replace: true }));
    },
    onSkip: () => {
      if (!busy) void attempt(() => mutations.guest.mutateAsync());
    },
    onApple: () => {
      if (!busy) void attempt(() => mutations.apple.mutateAsync());
    },
    onGoogle: () => {
      if (!busy) void attempt(() => mutations.google.mutateAsync());
    },
    onContinueWithEmail: () => {
      if (busy) return;
      clearFeedback();
      setStep('email');
    },
    onEmailChange: setEmail,
    onSendCode: () => void sendCode(),
    onCodeChange: (next: string) => {
      setCode(next);
      clearCodeError();
    },
    // OtpInput calls this on the sixth digit.
    onCodeComplete: (complete: string) => {
      if (busy) return;
      void attempt(() => mutations.verifyOtp.mutateAsync({ email: address, code: complete }));
    },
    onResend: () => {
      if (!cooldown.active) void sendCode();
    },
    onUseDifferentEmail: () => {
      clearFeedback();
      setCode('');
      setStep('email');
    },
    onTerms: () => void openLegal('terms'),
    onPrivacy: () => void openLegal('privacy'),
  };
}

export type LoginViewModel = ReturnType<typeof useLoginViewModel>;
