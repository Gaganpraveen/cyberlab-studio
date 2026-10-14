import { useSyncExternalStore } from 'react';

import { readJSON, storageKey, writeJSON } from './storage';

export interface PersistentStore<T> {
  get(): T;
  set(next: T | ((prev: T) => T)): void;
  subscribe(listener: () => void): () => void;
  /** Replace the in-memory value without writing (used for cross-tab sync). */
  reload(): void;
}

/**
 * A tiny external store persisted to localStorage, shared by every component
 * that reads it, and kept in sync across browser tabs.
 */
export function createPersistentStore<T>(
  key: string,
  initial: T,
  normalize: (raw: unknown) => T = (raw) => raw as T,
): PersistentStore<T> {
  let state: T = normalize(readJSON<unknown>(key, initial));
  const listeners = new Set<() => void>();

  const emit = () => {
    for (const listener of listeners) listener();
  };

  const store: PersistentStore<T> = {
    get: () => state,
    set(next) {
      const value = typeof next === 'function' ? (next as (prev: T) => T)(state) : next;
      if (Object.is(value, state)) return;
      state = value;
      writeJSON(key, state);
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    reload() {
      state = normalize(readJSON<unknown>(key, initial));
      emit();
    },
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (event.key === storageKey(key)) store.reload();
    });
  }

  return store;
}

export function useStore<T>(store: PersistentStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
