/**
 * Cache en mémoire pour le calendrier hégirien.
 *
 * Les valeurs ne sont jamais écrites sur disque : elles restent disponibles
 * pendant la vie du processus JavaScript et sont libérées à sa fermeture.
 */
const memoryCache = new Map<string, unknown>();

export function getHijriCache<T>(key: string): T | undefined {
  return memoryCache.get(key) as T | undefined;
}

export function setHijriCache<T>(key: string, value: T): void {
  memoryCache.set(key, value);
}
