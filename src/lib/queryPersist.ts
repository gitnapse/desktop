import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { Query } from "@tanstack/react-query";

const DB_NAME = "gitnapse-cache";
const STORE = "query";
const DB_VERSION = 1;

interface AsyncStore {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

const memory = new Map<string, string>();
const hasIndexedDb = typeof indexedDB !== "undefined";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("indexedDB open failed"));
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const request = run(transaction.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("indexedDB request failed"));
        transaction.oncomplete = () => db.close();
      }),
  );
}

/**
 * Async storage for the React Query cache. Prefers IndexedDB so navigation and
 * restarts reuse GitHub data instead of spending API rate limit; falls back to
 * an in-memory map when IndexedDB is unavailable.
 */
export const cacheStorage: AsyncStore = {
  async getItem(key) {
    if (!hasIndexedDb) {
      return memory.get(key) ?? null;
    }
    try {
      const value = await withStore<string | undefined>("readonly", (store) => store.get(key));
      return typeof value === "string" ? value : (memory.get(key) ?? null);
    } catch {
      return memory.get(key) ?? null;
    }
  },
  async setItem(key, value) {
    memory.set(key, value);
    if (!hasIndexedDb) {
      return;
    }
    try {
      await withStore("readwrite", (store) => store.put(value, key));
    } catch {
      // Quota or private mode: keep the in-memory copy only.
    }
  },
  async removeItem(key) {
    memory.delete(key);
    if (!hasIndexedDb) {
      return;
    }
    try {
      await withStore("readwrite", (store) => store.delete(key));
    } catch {
      // ignore
    }
  },
};

export const queryCacheKey = "gitnapse-query-cache";
export const queryCacheBuster = "2026-09-29";

export const queryPersister = createAsyncStoragePersister({
  storage: cacheStorage,
  key: queryCacheKey,
  // Serializing the whole cache is main-thread work; keep writes infrequent.
  throttleTime: 3000,
});

/** Drops the persisted cache (used on sign-out and from Settings). */
export async function clearPersistedCache(): Promise<void> {
  await queryPersister.removeClient();
}

/**
 * Query keys whose successful data is safe to persist. This is an allowlist of
 * public navigation data: authentication, token, device-flow, server-lifecycle
 * and rate-limit queries are deliberately absent, and a defensive regex rejects
 * anything that smells like a credential even if it were added by mistake.
 */
export const PERSISTED_QUERY_KEYS: ReadonlySet<string> = new Set([
  "repo",
  "repo-tree",
  "file",
  "repo-readme",
  "repo-commits",
  "repo-branches",
  "repo-languages",
  "repo-contributors",
  "compare",
  "commit-diff",
  "releases",
  "issues",
  "issue",
  "issue-comments",
  "pulls",
  "pull",
  "pr-files",
  "pr-commits",
  "pr-reviews",
  "pr-comments",
  "pr-conversation",
  "check-runs",
  "workflow-runs",
  "search-repos",
  "search-users",
  "search-code",
  "user-profile",
  "user-repos",
  "starred-repos",
  "user-events",
  "notifications",
  "theme-registry",
]);

const SENSITIVE = /token|auth|oauth|device|password|secret|credential/i;

// Cap the persisted payload so a single huge tree/diff can never make cache
// serialization slow. Large responses still work in memory; they just refetch.
const MAX_PERSISTED_ARRAY = 6000;
const MAX_PERSISTED_STRING = 200_000;

/** True only for allowlisted navigation keys that are not credential-shaped. */
export function shouldPersistQueryKey(key: readonly unknown[]): boolean {
  const root = String(key[0] ?? "");
  return PERSISTED_QUERY_KEYS.has(root) && !SENSITIVE.test(root);
}

/** Full predicate used by the persister: key allowlist plus a payload budget. */
export function shouldPersistQuery(query: Pick<Query, "queryKey" | "state">): boolean {
  if (query.state.status !== "success" || !shouldPersistQueryKey(query.queryKey)) {
    return false;
  }
  const data: unknown = query.state.data;
  if (Array.isArray(data) && data.length > MAX_PERSISTED_ARRAY) {
    return false;
  }
  if (typeof data === "string" && data.length > MAX_PERSISTED_STRING) {
    return false;
  }
  return true;
}
