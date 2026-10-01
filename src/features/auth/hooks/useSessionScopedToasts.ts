import { useEffect } from 'react';

import { dismissAllToasts } from '@/shared/ui/toast';

import { useAuthStore } from '../state/authStore';

/**
 * Toasts belong to the session that showed them. Whenever the signed-in person changes (sign-out,
 * sign-in, the remote session ending) every toast from before is cleared, so nothing from the previous
 * session (like an Undo) lingers on the next screen.
 *
 * It subscribes to the store rather than reacting in an effect: the clear runs synchronously inside the
 * state change, before the flow that caused it shows its own toast (e.g. "Signed out").
 */
export function useSessionScopedToasts(): void {
  useEffect(
    () =>
      useAuthStore.subscribe((state, previous) => {
        if (state.user?.id !== previous.user?.id) dismissAllToasts();
      }),
    [],
  );
}
