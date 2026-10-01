import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';

/** TanStack Query pauses and resumes network work based on NetInfo. `isConnected: null` (unknown) counts as online. */
export function wireOnlineManager(): void {
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => setOnline(state.isConnected !== false)),
  );
}
