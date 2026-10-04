import { Stack } from 'expo-router';
import { useUnistyles } from 'react-native-unistyles';

import { useNavigationMotion } from '@/theme';

/** The signed-in (or guest) app: the three tabs, pushed screens (sliding in from the right) and form sheets. */
export default function AppLayout() {
  const { theme } = useUnistyles();
  const transitions = useNavigationMotion();
  const sheet = {
    presentation: 'formSheet',
    // Sheets keep the platform's own slide-up, not the push slide.
    animation: 'default',
    sheetGrabberVisible: true,
    sheetCornerRadius: theme.radii.sheet,
    // The material's ground, so the cards inside a sheet read as raised, as they do on a screen.
    contentStyle: { backgroundColor: theme.material.ground },
  } as const;

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
      <Stack.Screen name="workout/active" />
      <Stack.Screen name="workout/add-exercise" />
      <Stack.Screen name="workout/saved/[id]" />
      <Stack.Screen name="exercises" />
      <Stack.Screen name="exercise/[id]" />
      <Stack.Screen name="routine/[id]" />
      <Stack.Screen name="calendar" />
      <Stack.Screen name="records" />
      <Stack.Screen name="session/[id]" />
      <Stack.Screen name="day/[date]" options={{ ...sheet, sheetAllowedDetents: 'fitToContents' }} />
      <Stack.Screen name="equipment-filter" options={{ ...sheet, sheetAllowedDetents: 'fitToContents' }} />
      <Stack.Screen name="create-exercise" options={{ ...sheet, sheetAllowedDetents: 'fitToContents' }} />
      <Stack.Screen name="log-weight" options={{ ...sheet, sheetAllowedDetents: 'fitToContents' }} />
      <Stack.Screen name="ffmi" options={{ ...sheet, sheetAllowedDetents: 'fitToContents' }} />
    </Stack>
  );
}
