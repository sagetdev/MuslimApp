// src/lib/quranFonts.ts
import * as Font from "expo-font";
import { HAFS_FONT, PAGE_FONTS } from "../data/quranFontMap";

const FONT_CDN = "https://verses.quran.foundation/fonts/quran/hafs";
const TOTAL_PAGES = 604;
const BATCH_SIZE = 8;

const fontPromises = new Map<string, Promise<void>>();

function ensureFont(name: string, source: Font.FontSource): Promise<void> {
  let promise = fontPromises.get(name);
  if (!promise) {
    promise = Font.loadAsync({ [name]: source }).catch((error) => {
      fontPromises.delete(name);
      throw error;
    });
    fontPromises.set(name, promise);
  }
  return promise;
}

export const pageFont = (page: number) => `QCF2_P${page}`;

export const loadPageFont = (page: number) =>
  ensureFont(
    pageFont(page),
    PAGE_FONTS[page] ?? { uri: `${FONT_CDN}/v2/ttf/p${page}.ttf` }
  );

export const loadHafsFont = () =>
  ensureFont(
    "UthmanicHafs",
    HAFS_FONT ?? { uri: `${FONT_CDN}/uthmanic_hafs/UthmanicHafs1Ver18.ttf` }
  );

let queue: number[] = [];
let workers = 0;
let started = false;
const MAX_WORKERS = 3;

async function worker(): Promise<void> {
  while (queue.length > 0) {
    const page = queue.shift();
    if (page === undefined) break;

    // Déjà chargée ou en cours : on passe directement à la suivante
    if (fontPromises.has(pageFont(page))) continue;

    await loadPageFont(page).catch(() => {});
    await new Promise<void>((resolve) => setTimeout(resolve, 16));
  }
  workers--;
}

/** Réordonne la file : les pages les plus proches de `page` passent en premier. */
export function setFontPriority(page: number): void {
  queue.sort((a, b) => Math.abs(a - page) - Math.abs(b - page));
  while (workers < MAX_WORKERS && queue.length > 0) {
    workers++;
    void worker();
  }
}

/** Lance le préchargement progressif des 604 polices. */
export function startFontPreload(centerPage = 1): void {
  if (!started) {
    started = true;
    queue = Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1);
  }
  setFontPriority(centerPage);
}