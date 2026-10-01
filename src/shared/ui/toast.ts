import { useEffect, useSyncExternalStore } from 'react';
import { toast } from 'sonner-native';

export interface ToastMessage {
  title: string;
  sub?: string;
  /** Adds an "Undo" action and keeps the toast up a little longer. */
  undo?: () => void;
}

// How many open surfaces want toasts at the top (see useToastsAtTop), and who to tell when that changes.
let atTop = 0;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const isAtTop = () => atTop > 0;
const change = (by: number) => {
  atTop += by;
  listeners.forEach((listener) => listener());
};

/**
 * While the caller is mounted, toasts appear at the top of the screen instead of above the tab bar. For a
 * surface whose own main action sits where the toast would land (the Day sheet's Check in), so the toast
 * never covers it.
 */
export function useToastsAtTop(): void {
  useEffect(() => {
    change(1);
    return () => change(-1);
  }, []);
}

/** For the toast host (AppToaster): whether toasts belong at the top right now. */
export function useToastsAreAtTop(): boolean {
  return useSyncExternalStore(subscribe, isAtTop);
}

/**
 * Toasts are keyed by their title: showing the same message again refreshes the toast on screen
 * instead of stacking a duplicate (e.g. a double-tapped action).
 */
export function showSuccess({ title, sub, undo }: ToastMessage): void {
  toast.success(title, {
    id: title,
    description: sub,
    // Undo also closes the toast: what it said ("now has 5 check-ins") is no longer true.
    action: undo
      ? {
          label: 'Undo',
          onClick: () => {
            toast.dismiss(title);
            undo();
          },
        }
      : undefined,
    duration: undo ? 5000 : 3500,
  });
}

export function showInfo({ title, sub }: Omit<ToastMessage, 'undo'>): void {
  toast.info(title, { id: title, description: sub, duration: 3000 });
}

/** Clears every toast, e.g. when the session changes or the app leaves the screen. */
export function dismissAllToasts(): void {
  toast.dismiss();
}
