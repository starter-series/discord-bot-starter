/**
 * Simple per-user rate limiter for bot commands.
 *
 * **Topology caveat:** the store is in-memory. A multi-process deploy
 * (e.g. discord.js sharding, multiple replicas behind the same gateway,
 * a horizontally scaled Worker pool) will not share counts and a noisy
 * user can spam by hitting different processes. For accurate limits in
 * those topologies, swap `store` for an external Redis (or any KV with
 * atomic increment + TTL) — the public API of this function is shaped
 * to make that drop-in.
 *
 * @param {number} maxHits - Maximum allowed invocations within the window.
 * @param {number} windowMs - Time window in milliseconds.
 */
function createRateLimiter(maxHits = 5, windowMs = 60_000) {
  const store = new Map();

  return {
    /**
     * Check whether the given key is rate-limited.
     * @param {string} key - Unique identifier (e.g., user ID).
     * @returns {{ limited: boolean, retryAfterMs: number }}
     */
    check(key) {
      const now = Date.now();
      let entry = store.get(key);
      if (!entry || now - entry.start >= windowMs) {
        entry = { start: now, count: 0 };
        store.set(key, entry);
      }
      entry.count++;
      if (entry.count > maxHits) {
        return { limited: true, retryAfterMs: windowMs - (now - entry.start) };
      }
      return { limited: false, retryAfterMs: 0 };
    },

    /** Periodic cleanup of stale entries. */
    cleanup() {
      const now = Date.now();
      for (const [key, entry] of store) {
        if (now - entry.start >= windowMs) store.delete(key);
      }
    },

    /** Number of entries currently held — for observability and tests. */
    size() {
      return store.size;
    },
  };
}

module.exports = { createRateLimiter };
