// scripts/generate-verse-to-page.mts
// Génère deux fichiers embarqués :
//   - src/data/verseToPage.json : { "2:255": 42, ... }     (verset → page)
//   - src/data/pageToVerse.json : { "42": [2, 255], ... }  (page → premier verset)
// Lancer UNE FOIS : npx tsx scripts/generate-verse-to-page.mts

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  findPage,
  getAyahCountInSurah,
  ayahsInPage,
  Surah,
  Page,
} from "quran-meta/hafs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "../src/data");

async function main() {
  // ---------- 1. verseToPage ----------
  const verseToPage: Record<string, number> = {};

  for (let surah = 1; surah <= 114; surah++) {
    const total = getAyahCountInSurah(surah as Surah);
    for (let verse = 1; verse <= total; verse++) {
      const page = findPage(surah as Surah, verse as any);
      verseToPage[`${surah}:${verse}`] = page;
    }
  }

  const verseSorted: Record<string, number> = {};
  Object.keys(verseToPage)
    .sort((a, b) => {
      const [as, av] = a.split(":").map(Number);
      const [bs, bv] = b.split(":").map(Number);
      return as - bs || av - bv;
    })
    .forEach((k) => { verseSorted[k] = verseToPage[k]; });

  await writeFile(
    resolve(OUT_DIR, "verseToPage.json"),
    JSON.stringify(verseSorted),
    "utf8"
  );
  console.log(`✅ verseToPage.json : ${Object.keys(verseSorted).length} entrées`);

  // ---------- 2. pageToVerse ----------
  // On enregistre le PREMIER [surah, ayah] de chaque page.
  const pageToVerse: Record<number, [number, number]> = {};

  for (let page = 1; page <= 604; page++) {
    const first = ayahsInPage(page as Page).next();
    if (first.done || !first.value) {
      console.error(`⚠️ page ${page} : aucun verset`);
      continue;
    }
    const [surah, ayah] = first.value;
    pageToVerse[page] = [surah, ayah];
  }

  await writeFile(
    resolve(OUT_DIR, "pageToVerse.json"),
    JSON.stringify(pageToVerse),
    "utf8"
  );
  console.log(`✅ pageToVerse.json : ${Object.keys(pageToVerse).length} entrées`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});