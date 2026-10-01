import { useState } from 'react';

import { useAuthStore } from '@/features/auth/state/authStore';
import { useSessionActions } from '@/shared/actions/session';
import { useHapticPreferencesStore } from '@/shared/state/hapticPreferencesStore';
import { useSoundPreferencesStore } from '@/shared/state/soundPreferencesStore';
import type { ReduceMotionPreference, ThemePreference } from '@/theme';
import { useThemePreferencesStore } from '@/theme/state/themePreferencesStore';

import { profileTitle } from '../domain/Profile';
import { useProfile } from '../hooks/useProfile';

export const THEME_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Parchment' },
  { value: 'dark', label: 'Walnut' },
] as const satisfies readonly { value: ThemePreference; label: string }[];

export const REDUCE_MOTION_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
] as const satisfies readonly { value: ReduceMotionPreference; label: string }[];

/** Profile, for now: the account, the look and feel (theme, motion, sound, haptics), and logging out. */
export function useProfileViewModel() {
  const user = useAuthStore((s) => s.user);
  const restartOnboarding = useAuthStore((s) => s.restartOnboarding);
  const { data: profile } = useProfile(user);
  const theme = useThemePreferencesStore((s) => s.preference);
  const setTheme = useThemePreferencesStore((s) => s.setPreference);
  const reduceMotion = useThemePreferencesStore((s) => s.reduceMotion);
  const setReduceMotion = useThemePreferencesStore((s) => s.setReduceMotion);
  const soundEffects = useSoundPreferencesStore((s) => s.soundEffects);
  const setSoundEffects = useSoundPreferencesStore((s) => s.setSoundEffects);
  const hapticsOn = useHapticPreferencesStore((s) => s.haptics);
  const setHaptics = useHapticPreferencesStore((s) => s.setHaptics);
  const { signOut } = useSessionActions();
  const [signingOut, setSigningOut] = useState(false);

  const isGuest = user?.provider === 'guest';

  return {
    name: profileTitle({
      displayName: profile?.displayName ?? user?.displayName ?? null,
      email: profile?.email ?? user?.email ?? null,
      provider: user?.provider ?? 'guest',
    }),
    accountLine: isGuest ? 'Guest · your training stays on this phone' : (user?.email ?? 'Signed in'),
    theme,
    themeOptions: THEME_OPTIONS,
    reduceMotion,
    reduceMotionOptions: REDUCE_MOTION_OPTIONS,
    soundEffects,
    haptics: hapticsOn,
    signingOut,

    onThemeChange: setTheme,
    onReduceMotionChange: setReduceMotion,
    onSoundEffectsChange: setSoundEffects,
    onHapticsChange: setHaptics,
    onReplayGetStarted: restartOnboarding,
    onSignOut: () => {
      if (signingOut) return;
      setSigningOut(true);
      void signOut().finally(() => setSigningOut(false));
    },
  };
}

export type ProfileViewModel = ReturnType<typeof useProfileViewModel>;
