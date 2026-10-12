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
    try {
      const { size } = await fs.stat(bundlePath);
      if (size > 1_000_000) {
        const existing = JSON.parse(await fs.readFile(bundlePath, "utf8")) as BundleResponse;
        if (Array.isArray(existing.pages) && existing.pages.length === TOTAL_PAGES) {
          console.log("✅ Bundle complet déjà présent");
          return;
        }
      }
    } catch {
      console.warn("⚠️ Bundle local invalide : nouveau téléchargement nécessaire.");
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
    throw new Error(
      `Impossible d'intégrer le Coran hors ligne au build (${message}). Vérifie EXPO_PUBLIC_API_URL et /api/mushaf/all-pages.`
    );
  }
}

async function downloadTextBundle(): Promise<void> {
  const bundlePath = path.join(OUT_DIR, "quran-text.qbundle");
  if (await exists(bundlePath)) {
    try {
      const existing = JSON.parse(await fs.readFile(bundlePath, "utf8")) as {
        version?: number;
        surahs?: unknown[];
      };
      if (existing.version === 1 && Array.isArray(existing.surahs) && existing.surahs.length === 114) {
        console.log("✅ Bundle texte complet déjà présent");
        return;
      }
    } catch {
      console.warn("⚠️ Bundle texte invalide : nouveau téléchargement nécessaire.");
    }
  }

  console.log("Téléchargement des 114 sourates pour le mode Versets...");
  const queue = Array.from({ length: 114 }, (_, index) => index + 1);
  const surahs: Array<{ number: number; data: unknown }> = new Array(114);
  const CONCURRENCY_TEXT = 6;
  let done = 0;

  await Promise.all(
    Array.from({ length: CONCURRENCY_TEXT }, async () => {
      while (queue.length > 0) {
        const number = queue.shift();
        if (number === undefined) return;

        let lastError: unknown;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const response = await fetch(`${BASE}/api/quran/surahs/${number}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const envelope = (await response.json()) as { data?: unknown };
            if (envelope.data == null) throw new Error("Réponse sans champ data");
            surahs[number - 1] = { number, data: envelope.data };
            lastError = null;
            break;
          } catch (error) {
            lastError = error;
          }
        }

        if (lastError) {
          const message = lastError instanceof Error ? lastError.message : String(lastError);
          throw new Error(`Sourate ${number} : ${message}`);
        }

        done++;
        if (done % 10 === 0 || done === 114) console.log(`${done}/114 sourates`);
      }
    })
  );

  if (surahs.some((surah) => !surah)) {
    throw new Error("Le bundle texte est incomplet : les 114 sourates sont obligatoires.");
  }

  await fs.writeFile(bundlePath, JSON.stringify({ version: 1, surahs }));
  const { size } = await fs.stat(bundlePath);
  console.log(`✅ Bundle texte créé : 114 sourates (${(size / 1024 / 1024).toFixed(2)} Mo)`);
}

async function main(): Promise<void> {
  await fs.mkdir(FONTS_DIR, { recursive: true });
  await fs.mkdir(path.dirname(MAP_FILE), { recursive: true });

  await downloadFonts();
  await writeFontMap();
  await downloadBundle();
  await downloadTextBundle();

  console.log("✅ Terminé");
}

main().catch((error: unknown) => {
  console.error("❌ Échec :", error);
  process.exit(1);
});