import AsyncStorage from '@react-native-async-storage/async-storage';
import * as aesjs from 'aes-js';
import { getRandomBytes } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface LargeSecureStoreDeps {
  /** Small, hardware-backed store for the AES key (SecureStore has a ~2 KB value limit). */
  keyStore: KeyValueStore;
  /** Large, unencrypted store that only ever receives ciphertext. */
  dataStore: KeyValueStore;
  randomBytes: (count: number) => Uint8Array;
}

const defaultDeps: LargeSecureStoreDeps = {
  keyStore: {
    getItem: (key) => SecureStore.getItemAsync(key),
    setItem: (key, value) => SecureStore.setItemAsync(key, value),
    removeItem: (key) => SecureStore.deleteItemAsync(key),
  },
  dataStore: AsyncStorage,
  randomBytes: getRandomBytes,
};

/**
 * Supabase session storage (pattern from Supabase's official Expo guide).
 * A fresh 256-bit AES key is stored in SecureStore; the AES-CTR-encrypted session is stored in AsyncStorage.
 *
 * Supabase re-reads the session before every request and every 30 s refresh tick, so each value is
 * decrypted once and then served from memory. Only this store writes those keys, and every write updates
 * memory first, so memory always holds what is (being) written. The session is in memory anyway whenever
 * Supabase uses it; the encryption protects it at rest.
 */
export class LargeSecureStore {
  private readonly memory = new Map<string, string | null>();
  /** Bumped by every write, so a disk read that a write overtook never caches the older value. */
  private writes = 0;

  constructor(private readonly deps: LargeSecureStoreDeps = defaultDeps) {}

  async getItem(key: string): Promise<string | null> {
    if (this.memory.has(key)) return this.memory.get(key) ?? null;
    const writesBefore = this.writes;
    const value = await this.readDecrypted(key);
    if (this.writes === writesBefore) this.memory.set(key, value);
    return value;
  }

  async setItem(key: string, value: string): Promise<void> {
    await this.write(key, value, () => this.writeEncrypted(key, value));
  }

  async removeItem(key: string): Promise<void> {
    await this.write(key, null, async () => {
      await this.deps.dataStore.removeItem(key);
      await this.deps.keyStore.removeItem(key);
    });
  }

  /** Memory first (reads during the write see the new value); forgotten again if persisting fails. */
  private async write(key: string, value: string | null, persist: () => Promise<void>): Promise<void> {
    const write = ++this.writes;
    this.memory.set(key, value);
    try {
      await persist();
    } catch (error) {
      // Unless a later write has replaced it meanwhile, the next read goes back to what is on disk.
      if (this.writes === write) this.memory.delete(key);
      throw error;
    }
  }

  private async readDecrypted(key: string): Promise<string | null> {
    const encrypted = await this.deps.dataStore.getItem(key);
    if (!encrypted) return null;
    const keyHex = await this.deps.keyStore.getItem(key);
    if (!keyHex) return null;
    const cipher = new aesjs.ModeOfOperation.ctr(aesjs.utils.hex.toBytes(keyHex), new aesjs.Counter(1));
    return aesjs.utils.utf8.fromBytes(cipher.decrypt(aesjs.utils.hex.toBytes(encrypted)));
  }

  private async writeEncrypted(key: string, value: string): Promise<void> {
    const encryptionKey = this.deps.randomBytes(256 / 8);
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const encrypted = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
    await this.deps.keyStore.setItem(key, aesjs.utils.hex.fromBytes(encryptionKey));
    await this.deps.dataStore.setItem(key, aesjs.utils.hex.fromBytes(encrypted));
  }
}
