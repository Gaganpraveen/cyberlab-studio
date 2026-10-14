/**
 * Safe wrappers around `localStorage`.
 *
 * Browser storage can be unavailable (private windows, blocked site data,
 * some embedded previews) or cleared at any time, so every access is guarded
 * and callers always get a usable fallback value.
 */

const PREFIX = 'cyberlab:';

function getStorage(): Storage | null {
  try {
    const storage = globalThis.localStorage;
    if (!storage) return null;
    const probe = `${PREFIX}__probe__`;
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

let cached: Storage | null | undefined;

function storage(): Storage | null {
  if (cached === undefined) cached = getStorage();
  return cached;
}

/** True when values written now are likely to survive a reload. */
export function isPersistentStorageAvailable(): boolean {
  return storage() !== null;
}

export function readJSON<T>(key: string, fallback: T): T {
  const store = storage();
  if (!store) return fallback;
  try {
    const raw = store.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): boolean {
  const store = storage();
  if (!store) return false;
  try {
    store.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key: string): void {
  try {
    storage()?.removeItem(PREFIX + key);
  } catch {
    // Ignore: nothing else we can do.
  }
}

/** The full key as stored, for matching `storage` events from other tabs. */
export function storageKey(key: string): string {
  return PREFIX + key;
}

/** Test helper: forget the cached storage handle. */
export function __resetStorageCacheForTests(): void {
  cached = undefined;
}
