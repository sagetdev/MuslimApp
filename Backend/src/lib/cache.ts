type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry<unknown>>();

const DEFAULT_TTL_MS = 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;

export function getCache<T>(key: string): T | undefined {
  const entry = cache.get(key);

  if (!entry) return undefined;

  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return undefined;
  }

  // Refresh insertion order so recently used entries survive eviction.
  cache.delete(key);
  cache.set(key, entry);

  return entry.value as T;
}

export function setCache<T>(
  key: string,
  value: T,
  ttlMs = DEFAULT_TTL_MS,
): void {
  cache.delete(key);

  // Remove expired entries before evicting useful data.
  const now = Date.now();

  for (const [existingKey, entry] of cache) {
    if (entry.expiresAt <= now) {
      cache.delete(existingKey);
    }
  }

  while (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value as string | undefined;

    if (oldestKey === undefined) break;

    cache.delete(oldestKey);
  }

  cache.set(key, {
    value,
    expiresAt: now + Math.max(0, ttlMs),
  });
}

export function deleteCache(key: string): void {
  cache.delete(key);
}

export function clearCache(): void {
  cache.clear();
}
