import { useEffect } from 'react';
import { AppState } from 'react-native';
import { Toaster } from 'sonner-native';
import { useUnistyles } from 'react-native-unistyles';

import { dismissAllToasts, useToastsAreAtTop } from './toast';

/**
 * Global toast host styled like the prototype: inverted colours, above the tab bar; or right under the
 * status bar while a surface asks for that (the Day sheet, whose Check in sits where a toast would land).
 * Toasts are momentary: leaving the app clears them. JS timers pause in the background, so otherwise a
 * toast would still be on screen when the app is reopened, long after it stopped being relevant.
 */
export function AppToaster() {
  const { theme, rt } = useUnistyles();
  const top = useToastsAreAtTop();
  // Inverted ink on its own slab, so a toast is never mistaken for part of the screen beneath it.
  const background = theme.colors.text;
  const foreground = theme.colors.canvas;

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') dismissAllToasts();
    });
    return () => subscription.remove();
  }, []);

  return (
    <Toaster
      position={top ? 'top-center' : 'bottom-center'}
      offset={top ? rt.insets.top + theme.spacing.sm : 104}
      theme={theme.scheme}
      swipeToDismissDirection="left"
      toastOptions={{
        style: { backgroundColor: background, borderRadius: theme.radii.control, borderWidth: 0 },
        titleStyle: { color: foreground, fontFamily: theme.fonts.semibold, fontSize: 14 },
        descriptionStyle: { color: foreground, opacity: 0.75, fontFamily: theme.fonts.regular, fontSize: 13 },
        // Undo: plain text in the heatmap's mid green (as in the prototype), legible on the inverted toast.
        actionButtonStyle: {
          backgroundColor: 'transparent',
          borderWidth: 0,
          paddingHorizontal: 0,
          paddingVertical: 4,
        },
        actionButtonTextStyle: { color: theme.heat[2], fontFamily: theme.fonts.semibold, fontSize: 14 },
      }}
    />
  );
}
