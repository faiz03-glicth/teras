import { focusManager } from '@tanstack/react-query';
import { AppState } from 'react-native';

/** Returning to the foreground counts as "window focus", so stale queries refetch. */
export function wireFocusManager(): void {
  focusManager.setEventListener((handleFocus) => {
    const subscription = AppState.addEventListener('change', (state) => handleFocus(state === 'active'));
    return () => subscription.remove();
  });
}
