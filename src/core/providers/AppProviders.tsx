import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-unistyles';

import { MotionRuntimeBridge, ThemeRuntimeBridge } from '@/theme';

import { wireFocusManager } from '../query/focusManager';
import { wireOnlineManager } from '../query/onlineManager';
import { createQueryClient } from '../query/queryClient';

wireOnlineManager();
wireFocusManager();
const queryClient = createQueryClient();

/** App-wide providers, outermost first. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <QueryClientProvider client={queryClient}>
            <MotionRuntimeBridge />
            {children}
            {/* Last, so its theme-change veil sits above the whole app. */}
            <ThemeRuntimeBridge />
          </QueryClientProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: { flex: 1, backgroundColor: theme.colors.canvas },
}));
