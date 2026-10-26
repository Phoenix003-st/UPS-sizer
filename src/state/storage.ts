/**
 * Stockage persistant dans le navigateur : IndexedDB (idb-keyval), repli sur localStorage puis sur
 * la mémoire si IndexedDB est indisponible (navigation privée, environnement de test).
 * Les projets ne quittent jamais le navigateur.
 */
import { del, get, set } from 'idb-keyval';
import type { StateStorage } from 'zustand/middleware';

const memory = new Map<string, string>();

function hasIndexedDb(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

const fallback: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return memory.get(name) ?? null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      memory.set(name, value);
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      memory.delete(name);
    }
  },
};

export const browserStorage: StateStorage = hasIndexedDb()
  ? {
      getItem: async (name) => {
        try {
          return ((await get<string>(name)) ?? null) as string | null;
        } catch {
          return fallback.getItem(name);
        }
      },
      setItem: async (name, value) => {
        try {
          await set(name, value);
        } catch {
          await fallback.setItem(name, value);
        }
      },
      removeItem: async (name) => {
        try {
          await del(name);
        } catch {
          await fallback.removeItem(name);
        }
      },
    }
  : fallback;
