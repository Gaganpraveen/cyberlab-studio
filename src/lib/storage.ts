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

/** The full key as stored, for matching `storage` events from other tabs. */
export function storageKey(key: string): string {
  return PREFIX + key;
}
