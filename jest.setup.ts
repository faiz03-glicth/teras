// Global Jest setup: replaces native modules with in-memory or no-op versions.

require('react-native-reanimated').setUpTests();
require('react-native-gesture-handler/jestSetup');

// TanStack Query batches UI notifications on setTimeout; run them synchronously so updates land inside act().
require('@tanstack/react-query').notifyManager.setScheduler((callback: () => void) => callback());

jest.mock('react-native-unistyles', () => require('./test/mocks/unistyles'));

jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

jest.mock('react-native-keyboard-controller', () => require('react-native-keyboard-controller/jest'));

// Synchronous SQLite key/value store used by Zustand persist.
jest.mock('expo-sqlite/kv-store', () => {
  const data = new Map<string, string>();
  const Storage = {
    getItemSync: (key: string) => data.get(key) ?? null,
    setItemSync: (key: string, value: string) => void data.set(key, value),
    removeItemSync: (key: string) => data.delete(key),
    clearSync: () => data.clear(),
  };
  return { __esModule: true, Storage, default: Storage };
});

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock.js'),
);

jest.mock('expo-apple-authentication', () => require('./test/mocks/appleAuthentication'));

jest.mock('sonner-native', () => ({
  toast: Object.assign(jest.fn(), {
    success: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    dismiss: jest.fn(),
  }),
  Toaster: () => null,
}));

// FlashList draws only what fits the screen it measures; tests have no layout, so give it a phone-sized one.
// (The package's own jestSetup swaps in a RecyclerView this version doesn't export.)
jest.mock('@shopify/flash-list/dist/recyclerview/utils/measureLayout', () => {
  const screen = { x: 0, y: 0, width: 400, height: 900 };
  return {
    ...jest.requireActual('@shopify/flash-list/dist/recyclerview/utils/measureLayout'),
    measureParentSize: jest.fn(() => screen),
    measureFirstChildLayout: jest.fn(() => screen),
    measureItemLayout: jest.fn(() => ({ x: 0, y: 0, width: 400, height: 60 })),
  };
});
