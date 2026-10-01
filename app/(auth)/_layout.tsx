import { Stack } from 'expo-router';
import { useUnistyles } from 'react-native-unistyles';

import { useRouteGuards } from '@/features/auth/hooks/useRouteGuards';
import { onboardingStepOf } from '@/shared/actions/params';
import { useNavigationMotion } from '@/theme';

/**
 * Where the auth group opens:
 * - first launch → Welcome (onboarding step 0)
 * - signed in or guest but onboarding unfinished (e.g. app killed mid-setup) → onboarding step 1
 * - signed out after onboarding (e.g. after "Log out") → Login, returning-user variant
 */
export default function AuthLayout() {
  const { hasCompletedOnboarding, inSession } = useRouteGuards();
  const transitions = useNavigationMotion();
  const { theme } = useUnistyles();
  return (
    <Stack
      initialRouteName={hasCompletedOnboarding ? 'login' : 'onboarding'}
      screenOptions={{
        headerShown: false,
        animation: transitions.push,
        animationDuration: transitions.fadeMs,
        // Replacing Login with onboarding step 1 after sign-in slides forward like a push.
        animationTypeForReplace: 'push',
        contentStyle: { backgroundColor: theme.colors.canvas },
      }}
    >
      <Stack.Screen
        name="onboarding"
        initialParams={{ step: inSession ? '1' : '0' }}
        // Welcome is where the flow starts, so replacing a screen with it (Login → Back) is a step back.
        options={({ route }) => ({
          animationTypeForReplace: onboardingStepOf(route.params) === 0 ? 'pop' : 'push',
        })}
      />
      <Stack.Screen name="login" initialParams={{ intent: hasCompletedOnboarding ? 'existing' : 'new' }} />
    </Stack>
  );
}
