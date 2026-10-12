import fs from "node:fs/promises";
import path from "node:path";

const RAW_BASE =
  process.argv[2] ?? process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";
const BASE = RAW_BASE.replace(/\/+$/, "").replace(/\/api$/, "");
const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "assets", "quran");
const FONTS_DIR = path.join(OUT_DIR, "fonts");
const MAP_FILE = path.join(ROOT, "src", "data", "quranFontMap.ts");
const FONT_CDN = "https://verses.quran.foundation/fonts/quran/hafs";
const TOTAL_PAGES = 604;
const CONCURRENCY = 8;

type BundleResponse = {
  version: number;
  pages: unknown[];
};

async function exists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function download(url: string, dest: string): Promise<void> {
  if (await exists(dest)) return;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()));
      return;
    } catch (error) {
      if (attempt === 2) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`${url} → ${message}`);
      }
    }
  }
}

async function downloadFonts(): Promise<void> {
  console.log("Téléchargement des polices...");
  await download(
    `${FONT_CDN}/uthmanic_hafs/UthmanicHafs1Ver18.ttf`,
    path.join(FONTS_DIR, "UthmanicHafs.ttf")
  );

  const queue: number[] = Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1);
  let done = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length > 0) {
        const page = queue.shift();
        if (page === undefined) return;
        await download(
          `${FONT_CDN}/v2/ttf/p${page}.ttf`,
          path.join(FONTS_DIR, `p${page}.ttf`)
        );
        done++;
        if (done % 50 === 0) console.log(`${done}/${TOTAL_PAGES} polices`);
      }
    })
  );
}

async function writeFontMap(): Promise<void> {
  const lines: string[] = [];
  for (let p = 1; p <= TOTAL_PAGES; p++) {
    lines.push(`  ${p}: require("../../assets/quran/fonts/p${p}.ttf"),`);
  }
  const content = `// Fichier généré par scripts/fetch-quran-assets.mts — ne pas modifier.
export const HAFS_FONT: number = require("../../assets/quran/fonts/UthmanicHafs.ttf");

export const PAGE_FONTS: Record<number, number> = {
${lines.join("\n")}
};
`;
  await fs.writeFile(MAP_FILE, content);
  console.log(`✅ ${MAP_FILE}`);
}

async function downloadBundle(): Promise<void> {
  const bundlePath = path.join(OUT_DIR, "quran-all.qbundle");

  if (await exists(bundlePath)) {
    const { size } = await fs.stat(bundlePath);
    if (size > 1_000_000) {
      console.log("✅ Bundle déjà présent");
      return;
    }
  }

  try {
    console.log(`Téléchargement du bundle depuis ${BASE}/api/mushaf/all-pages ...`);
    const res = await fetch(`${BASE}/api/mushaf/all-pages`);
    if (!res.ok) throw new Error(`Bundle HTTP ${res.status}`);
    const bundle = (await res.json()) as BundleResponse;
    if (!Array.isArray(bundle.pages) || bundle.pages.length !== TOTAL_PAGES) {
      throw new Error(
        `Bundle incomplet : ${bundle.pages?.length ?? 0}/${TOTAL_PAGES} pages`
      );
    }
    await fs.writeFile(
      bundlePath,
      JSON.stringify({ version: bundle.version, pages: bundle.pages })
    );
    console.log(`✅ ${bundle.pages.length} pages`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`⚠️ Bundle non téléchargé (${message}). Placeholder vide écrit.`);
    if (!(await exists(bundlePath))) {
      await fs.writeFile(bundlePath, JSON.stringify({ version: 0, pages: [] }));
    }
  }
}

async function main(): Promise<void> {
  await fs.mkdir(FONTS_DIR, { recursive: true });
  await fs.mkdir(path.dirname(MAP_FILE), { recursive: true });

  await downloadFonts();
  await writeFontMap();
  await downloadBundle();

  console.log("✅ Terminé");
}

main().catch((error: unknown) => {
  console.error("❌ Échec :", error);
  process.exit(1);
});