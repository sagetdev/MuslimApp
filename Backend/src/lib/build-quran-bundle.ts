// scripts/build-quran-bundle.ts (à la racine du backend)
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fetchAllMushafPages } from "../services/quran-foundation.service.js";

async function main() {
  console.log("Fetching 604 pages...");
  const pages = await fetchAllMushafPages((c, t) => {
    if (c % 25 === 0) console.log(`${c}/${t}`);
  });

  const bundle = {
    version: 1,
    generatedAt: new Date().toISOString(),
    count: pages.length,
    pages,
  };

  const outDir = path.join(process.cwd(), "public");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, "quran-all.json");
  fs.writeFileSync(outPath, JSON.stringify(bundle));

  const size = fs.statSync(outPath).size;
  console.log(`✅ Bundle créé : ${outPath} (${(size / 1024 / 1024).toFixed(2)} Mo)`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});