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
      <Stack.Screen name="routine-preview/[id]" />
      <Stack.Screen name="calendar/index" />
      <Stack.Screen name="calendar/[year]/index" />
      <Stack.Screen name="calendar/[year]/[month]" />
      <Stack.Screen name="records" />
      <Stack.Screen name="session/[id]" />
      <Stack.Screen name="day/[date]" options={{ ...sheet, sheetAllowedDetents: 'fitToContents' }} />
      <Stack.Screen name="equipment-filter" options={{ ...sheet, sheetAllowedDetents: 'fitToContents' }} />
      <Stack.Screen name="create-exercise" options={{ ...sheet, sheetAllowedDetents: 'fitToContents' }} />
      <Stack.Screen name="log-weight" options={{ ...sheet, sheetAllowedDetents: 'fitToContents' }} />
      <Stack.Screen name="ffmi" options={{ ...sheet, sheetAllowedDetents: 'fitToContents' }} />
      {/* The picture preview, the pickers and the keys fill a phone: this sheet opens at full height. */}
      {/* A full page, not a form sheet: Share scrolls, and pulling back up at the top of a sheet closed it.
          It slides up like a sheet but only Close or Back leaves it. */}
      <Stack.Screen
        name="share/[workoutId]"
        options={{
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
          gestureEnabled: false,
          contentStyle: { backgroundColor: theme.material.ground },
        }}
      />
    </Stack>
  );
}
