export const ANALYTICS_CACHE_TTL_MS = 30_000;
export const MAX_ANALYTICS_ARTICLE_IDS = 100;

/** A bounded cache that shares pending reads and never retains failures. */
export function createAnalyticsCache({ now = () => Date.now(), maxEntries = 256 } = {}) {
  const entries = new Map();
  return {
    /**
     * @template T
     * @param {string} key
     * @param {() => Promise<T>} load
     * @returns {Promise<T>}
     */
    read(key, load) {
      const cached = entries.get(key);
      if (cached && cached.expiresAt > now()) return cached.promise;
      entries.delete(key);
      while (entries.size >= maxEntries) entries.delete(entries.keys().next().value);
      const entry = { expiresAt: now() + ANALYTICS_CACHE_TTL_MS, promise: null };
      entry.promise = Promise.resolve().then(load).catch((error) => {
        if (entries.get(key) === entry) entries.delete(key);
        throw error;
      });
      entries.set(key, entry);
      return entry.promise;
    },
    clear() {
      // Detached in-flight reads cannot repopulate the cache after a mutation.
      entries.clear();
    },
  };
}
