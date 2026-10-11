// src/lib/quranCache.ts
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

const CACHE_DIR = `${FileSystem.cacheDirectory}quran-cache/`;
const PAGES_DIR = `${CACHE_DIR}pages/`;
const INDEX_FILE = `${CACHE_DIR}index.json`;

const isWeb = Platform.OS === "web";

// ---------- Cache L1 (mémoire) ----------
const MAX_MEMORY_ITEMS = 20;
const memoryCache = new Map<number, unknown>();

function memoryGet<T>(page: number): T | null {
  if (!memoryCache.has(page)) return null;
  return memoryCache.get(page) as T;
}

function memorySet(page: number, value: unknown) {
  // LRU simple : si on dépasse, on retire le plus ancien (FIFO via Map)
  if (memoryCache.has(page)) memoryCache.delete(page);
  memoryCache.set(page, value);
  if (memoryCache.size > MAX_MEMORY_ITEMS) {
    const firstKey = memoryCache.keys().next().value;
    if (firstKey !== undefined) memoryCache.delete(firstKey);
  }
}

function memoryClear() {
  memoryCache.clear();
}

// ---------- Cache L2 (disque) ----------
type CacheIndex = {
  pages: Record<string, number>; // page -> timestamp
};

let indexLoaded = false;
let index: CacheIndex = { pages: {} };

async function ensureDirs() {
  if (isWeb) return;
  const info = await FileSystem.getInfoAsync(PAGES_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PAGES_DIR, { intermediates: true });
  }
}

async function loadIndex() {
  if (indexLoaded) return;
  indexLoaded = true;

  if (isWeb) {
    try {
      const raw = localStorage.getItem("quran-cache-index");
      if (raw) index = JSON.parse(raw);
    } catch {
      index = { pages: {} };
    }
    return;
  }

  try {
    const info = await FileSystem.getInfoAsync(INDEX_FILE);
    if (info.exists) {
      const raw = await FileSystem.readAsStringAsync(INDEX_FILE);
      index = JSON.parse(raw);
    }
  } catch {
    index = { pages: {} };
  }
}

async function saveIndex() {
  if (isWeb) {
    try {
      localStorage.setItem("quran-cache-index", JSON.stringify(index));
    } catch {}
    return;
  }
  try {
    await FileSystem.writeAsStringAsync(INDEX_FILE, JSON.stringify(index));
  } catch {}
}

function pageFilePath(page: number) {
  return `${PAGES_DIR}p${page}.json`;
}

// ---------- API publique ----------

/**
 * Lecture : L1 (mémoire) puis L2 (disque).
 */
export async function getCachedPage<T = unknown>(page: number): Promise<T | null> {
  // L1
  const inMemory = memoryGet<T>(page);
  if (inMemory) return inMemory;

  // L2
  await loadIndex();
  if (!index.pages[page]) return null;

  if (isWeb) {
    try {
      const raw = localStorage.getItem(`quran-page-${page}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as T;
      memorySet(page, parsed);
      return parsed;
    } catch {
      return null;
    }
  }

  try {
    const info = await FileSystem.getInfoAsync(pageFilePath(page));
    if (!info.exists) return null;
    const raw = await FileSystem.readAsStringAsync(pageFilePath(page));
    const parsed = JSON.parse(raw) as T;
    memorySet(page, parsed); // alimente L1
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Écriture : L1 (mémoire) + L2 (disque).
 */
export async function setCachedPage(page: number, data: unknown): Promise<void> {
  memorySet(page, data);
  await ensureDirs();
  await loadIndex();

  const json = JSON.stringify(data);

  if (isWeb) {
    try {
      localStorage.setItem(`quran-page-${page}`, json);
      index.pages[page] = Date.now();
      await saveIndex();
    } catch {}
    return;
  }

  try {
    await FileSystem.writeAsStringAsync(pageFilePath(page), json);
    index.pages[page] = Date.now();
    await saveIndex();
  } catch {}
}

export async function getCachedPages(): Promise<number[]> {
  await loadIndex();
  return Object.keys(index.pages).map(Number);
}

export async function getCachedCount(): Promise<number> {
  await loadIndex();
  return Object.keys(index.pages).length;
}

export async function clearQuranCache(): Promise<void> {
  memoryClear();
  index = { pages: {} };
  indexLoaded = true;

  if (isWeb) {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith("quran-page-") || k === "quran-cache-index")) {
          keys.push(k);
        }
      }
      keys.forEach((k) => localStorage.removeItem(k));
    } catch {}
    return;
  }

  try {
    const info = await FileSystem.getInfoAsync(CACHE_DIR);
    if (info.exists) {
      await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
    }
  } catch {}
}