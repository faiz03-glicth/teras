import { AppState, type AppStateStatus } from 'react-native';

interface AutoRefreshControl {
  startAutoRefresh(): Promise<void>;
  stopAutoRefresh(): Promise<void>;
}

/**
 * Token refresh only runs while the app is in the foreground (Supabase's React Native guidance).
 * Returns an unsubscribe function.
 */
export function registerAuthAutoRefresh(auth: AutoRefreshControl): () => void {
  const apply = (state: AppStateStatus) => {
    void (state === 'active' ? auth.startAutoRefresh() : auth.stopAutoRefresh());
  };
  apply(AppState.currentState);
  const subscription = AppState.addEventListener('change', apply);
  return () => subscription.remove();
}
