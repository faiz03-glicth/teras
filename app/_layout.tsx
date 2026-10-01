import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useMemo, type ReactNode } from 'react';
import { useUnistyles } from 'react-native-unistyles';

import { BootGate } from '@/core/bootstrap/BootGate';
import { AppProviders } from '@/core/providers/AppProviders';
import { RepositoriesProvider } from '@/core/RepositoriesProvider';
import { useAuthAutoRefresh } from '@/core/supabase/useAuthAutoRefresh';
import { useRouteGuards } from '@/features/auth/hooks/useRouteGuards';
import { SessionGate } from '@/features/auth/ui/SessionGate';
import { usePushPendingProfileEdits } from '@/features/profile/hooks/usePushPendingProfileEdits';
import { usePushPendingWorkoutDays } from '@/features/workoutDays/hooks/usePushPendingWorkoutDays';
import { AppToaster } from '@/shared/ui';
import { useNavigationMotion } from '@/theme';

/**
 * Gives the navigators the app's own colours. Without it, the space behind screens during a transition is
 * React Navigation's default white/grey, which flashes (especially in dark mode).
 */
function NavigationTheme({ children }: { children: ReactNode }) {
  const { theme } = useUnistyles();
  const value = useMemo(() => {
    const base = theme.scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.colors.accent,
        background: theme.colors.canvas,
        card: theme.colors.canvas,
        text: theme.colors.text,
        border: theme.colors.border,
      },
    };
  }, [theme]);
  return <ThemeProvider value={value}>{children}</ThemeProvider>;
}

/**
 * Exactly one group is reachable at a time; the guards move people between them (with the motion system's
 * cross-fade: finishing onboarding fades into the app, logging out fades back to Login).
 */
function RootNavigator() {
  useAuthAutoRefresh();
  usePushPendingProfileEdits();
  usePushPendingWorkoutDays();
  const { theme } = useUnistyles();
  const { canEnterApp, canEnterAuth } = useRouteGuards();
  const transitions = useNavigationMotion();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: transitions.groupSwitch,
        animationDuration: transitions.fadeMs,
        contentStyle: { backgroundColor: theme.colors.canvas },
      }}
    >
      <Stack.Protected guard={canEnterApp}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={canEnterAuth}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <BootGate>
        <RepositoriesProvider>
          <SessionGate>
            <NavigationTheme>
              <RootNavigator />
            </NavigationTheme>
            <AppToaster />
          </SessionGate>
        </RepositoriesProvider>
      </BootGate>
    </AppProviders>
  );
}
