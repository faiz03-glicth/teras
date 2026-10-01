import { Stack } from 'expo-router';
import { useUnistyles } from 'react-native-unistyles';

import { useNavigationMotion } from '@/theme';

/** The signed-in (or guest) app: the three tabs. Pushed screens and sheets are added here as they are built. */
export default function AppLayout() {
  const { theme } = useUnistyles();
  const transitions = useNavigationMotion();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: transitions.push,
        animationDuration: transitions.fadeMs,
        contentStyle: { backgroundColor: theme.colors.canvas },
      }}
    >
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
