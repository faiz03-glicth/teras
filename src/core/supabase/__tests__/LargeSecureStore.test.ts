import { LargeSecureStore } from '../LargeSecureStore';

function memoryStore() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: jest.fn(async (key: string) => data.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => void data.set(key, value)),
    removeItem: jest.fn(async (key: string) => void data.delete(key)),
  };
}

let counter = 0;
const randomBytes = (count: number) =>
  Uint8Array.from({ length: count }, (_, i) => (i * 7 + ++counter) % 256);

describe('LargeSecureStore', () => {
  const session = JSON.stringify({ access_token: 'secret-token', user: { email: 'person@example.com' } });

  it('round-trips a value', async () => {
    const store = new LargeSecureStore({ keyStore: memoryStore(), dataStore: memoryStore(), randomBytes });
    await store.setItem('sb-session', session);
    await expect(store.getItem('sb-session')).resolves.toBe(session);
  });

  it('keeps only ciphertext in the data store and a 256-bit key in the key store', async () => {
    const keyStore = memoryStore();
    const dataStore = memoryStore();
    const store = new LargeSecureStore({ keyStore, dataStore, randomBytes });

    await store.setItem('sb-session', session);

    const stored = dataStore.data.get('sb-session') ?? '';
    expect(stored).not.toContain('secret-token');
    expect(stored).not.toContain('person@example.com');
    expect(keyStore.data.get('sb-session')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns null when either half is missing and removes both halves', async () => {
    const keyStore = memoryStore();
    const dataStore = memoryStore();
    const store = new LargeSecureStore({ keyStore, dataStore, randomBytes });

    await expect(store.getItem('missing')).resolves.toBeNull();
    await store.setItem('k', 'v');
    keyStore.data.delete('k');
    // A fresh instance reads the disk, as the next launch does.
    await expect(new LargeSecureStore({ keyStore, dataStore, randomBytes }).getItem('k')).resolves.toBeNull();

    await store.setItem('k', 'v');
    await store.removeItem('k');
    expect(dataStore.data.has('k')).toBe(false);
    expect(keyStore.data.has('k')).toBe(false);
    await expect(store.getItem('k')).resolves.toBeNull();
  });

  it('decrypts a stored value once, then serves it from memory', async () => {
    const keyStore = memoryStore();
    const dataStore = memoryStore();
    await new LargeSecureStore({ keyStore, dataStore, randomBytes }).setItem('sb-session', session);
    const store = new LargeSecureStore({ keyStore, dataStore, randomBytes });

    for (let read = 0; read < 5; read++) await expect(store.getItem('sb-session')).resolves.toBe(session);
    expect(keyStore.getItem).toHaveBeenCalledTimes(1);
    expect(dataStore.getItem).toHaveBeenCalledTimes(1);
  });

  it('serves what was last written without reading the disk', async () => {
    const keyStore = memoryStore();
    const dataStore = memoryStore();
    const store = new LargeSecureStore({ keyStore, dataStore, randomBytes });

    await store.setItem('sb-session', session);
    await store.setItem('sb-session', 'refreshed');
    await expect(store.getItem('sb-session')).resolves.toBe('refreshed');
    await store.removeItem('sb-session');
    await expect(store.getItem('sb-session')).resolves.toBeNull();
    expect(keyStore.getItem).not.toHaveBeenCalled();
    expect(dataStore.getItem).not.toHaveBeenCalled();
  });

  it('never caches a read that a write overtook', async () => {
    const keyStore = memoryStore();
    const dataStore = memoryStore();
    await new LargeSecureStore({ keyStore, dataStore, randomBytes }).setItem('k', 'old');
    const store = new LargeSecureStore({ keyStore, dataStore, randomBytes });

    let releaseRead: () => void = () => undefined;
    dataStore.getItem.mockImplementationOnce(async (key) => {
      const value = dataStore.data.get(key) ?? null;
      await new Promise<void>((resolve) => (releaseRead = resolve));
      return value;
    });
    const slowRead = store.getItem('k');
    await Promise.resolve();
    await store.setItem('k', 'new');
    releaseRead();
    // It read the old data with the new key: the half-written pair any overlapping read could see.
    await expect(slowRead).resolves.not.toBe('new');

    await expect(store.getItem('k')).resolves.toBe('new');
  });

  it('goes back to the disk after a write that failed to persist', async () => {
    const keyStore = memoryStore();
    const dataStore = memoryStore();
    const store = new LargeSecureStore({ keyStore, dataStore, randomBytes });
    await store.setItem('k', 'saved');

    dataStore.setItem.mockRejectedValueOnce(new Error('disk full'));
    await expect(store.setItem('k', 'lost')).rejects.toThrow('disk full');
    // The key was replaced but the data wasn't: the same unreadable pair the next launch would find.
    await expect(store.getItem('k')).resolves.not.toBe('lost');
    expect(dataStore.getItem).toHaveBeenCalledTimes(1);
  });
});
