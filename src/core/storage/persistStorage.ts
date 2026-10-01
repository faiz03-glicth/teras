import { Storage } from 'expo-sqlite/kv-store';
import { createJSONStorage, type StateStorage } from 'zustand/middleware';

/**
 * Synchronous SQLite key/value storage for Zustand `persist`.
 * Being synchronous means persisted state is hydrated before the first render, so route guards never flash.
 */
const syncKvStorage: StateStorage = {
  getItem: (key) => Storage.getItemSync(key),
  setItem: (key, value) => Storage.setItemSync(key, value),
  removeItem: (key) => {
    Storage.removeItemSync(key);
  },
};

export const persistStorage = createJSONStorage(() => syncKvStorage);
