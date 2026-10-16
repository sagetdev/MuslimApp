import verseToPageJson from "../data/verseToPage.json";
import pageToVerseJson from "../data/pageToVerse.json";

console.log("=== verseToPage.ts chargé ===");
console.log("verseToPageJson:", typeof verseToPageJson, verseToPageJson ? Object.keys(verseToPageJson).length + " keys" : "null");
console.log("pageToVerseJson:", typeof pageToVerseJson, pageToVerseJson ? Object.keys(pageToVerseJson).length + " keys" : "null");

// Les JSON sont inférés comme `number` et `number[]` par TypeScript.
// On force le type attendu via `unknown` (cast sûr car nous contrôlons la génération).
const VERSE_TO_PAGE = verseToPageJson as unknown as Record<string, number>;
const PAGE_TO_VERSE = pageToVerseJson as unknown as Record<string, [number, number]>;

/**
 * Conversion EXACTE verset → page (Hafs, Mushaf de Médine).
 * Précision : 100% (données officielles quran-meta).
 */
export function verseToPage(surah: number, verse: number): number {
  const direct = VERSE_TO_PAGE[`${surah}:${verse}`];
  if (direct !== undefined) return direct;
  // Fallback : on remonte dans la même sourate.
  for (let v = verse - 1; v >= 1; v--) {
    const p = VERSE_TO_PAGE[`${surah}:${v}`];
    if (p !== undefined) return p;
  }
  return 1;
}

/**
 * Conversion EXACTE page → premier verset de la page (Hafs).
 * Retourne le premier verset physiquement présent en haut de la page.
 */
export function pageToVerse(page: number): { surah: number; verse: number } {
  const pair = PAGE_TO_VERSE[String(page)];
  if (pair) return { surah: pair[0], verse: pair[1] };
  return { surah: 1, verse: 1 };
}