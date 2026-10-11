// src/lib/quranBundle.ts
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import { clearQuranCache, setCachedPage, getCachedCount } from "./quranCache";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const BUNDLE_URL = `${API_URL?.replace(/\/+$/, "")}/api/mushaf/all-pages`;

const BUNDLE_PATH = `${FileSystem.documentDirectory}quran-all.json`;
const BUNDLE_VERSION_FILE = `${FileSystem.documentDirectory}quran-all.version`;

export type BundleProgress = {
  bytesWritten: number;
  bytesTotal: number;
  ratio: number; // 0..1
  phase: "downloading" | "parsing" | "caching";
};

export type BundleResult = {
  pages: number;
  bytes: number;
  durationMs: number;
  version: number;
};

// ---------- État persistant ----------

export async function isBundleDownloaded(): Promise<boolean> {
  if (Platform.OS === "web") {
    return localStorage.getItem("quran-bundle-loaded") === "1";
  }
  const info = await FileSystem.getInfoAsync(BUNDLE_PATH);
  return info.exists;
}

export async function getLocalBundleVersion(): Promise<number | null> {
  if (Platform.OS === "web") {
    const v = localStorage.getItem("quran-bundle-version");
    return v ? Number(v) : null;
  }
  try {
    const info = await FileSystem.getInfoAsync(BUNDLE_VERSION_FILE);
    if (!info.exists) return null;
    const raw = await FileSystem.readAsStringAsync(BUNDLE_VERSION_FILE);
    return Number(raw.trim()) || null;
  } catch {
    return null;
  }
}

export async function getRemoteBundleVersion(): Promise<number> {
  const response = await fetch(`${BUNDLE_URL}/version`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const json = (await response.json()) as { version: number };
  return json.version;
}

export async function deleteBundle(): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem("quran-bundle-loaded");
    localStorage.removeItem("quran-bundle-version");
    return;
  }
  await FileSystem.deleteAsync(BUNDLE_PATH, { idempotent: true });
  await FileSystem.deleteAsync(BUNDLE_VERSION_FILE, { idempotent: true });
}

// ---------- Téléchargement ----------

export async function downloadBundle(
  onProgress?: (p: BundleProgress) => void
): Promise<BundleResult> {
  if (!API_URL) throw new Error("EXPO_PUBLIC_API_URL manquant.");

  const start = Date.now();

  // ---------- Web : fetch + parse direct ----------
  if (Platform.OS === "web") {
    onProgress?.({ bytesWritten: 0, bytesTotal: 0, ratio: 0, phase: "downloading" });
    const response = await fetch(BUNDLE_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    onProgress?.({ bytesWritten: 0, bytesTotal: 0, ratio: 0.5, phase: "parsing" });
    const bundle = (await response.json()) as {
      version: number;
      pages: unknown[];
    };

    onProgress?.({ bytesWritten: 0, bytesTotal: 0, ratio: 0.8, phase: "caching" });
    await distributeBundle(bundle.pages);

    localStorage.setItem("quran-bundle-loaded", "1");
    localStorage.setItem("quran-bundle-version", String(bundle.version));

    return {
      pages: bundle.pages.length,
      bytes: 0,
      durationMs: Date.now() - start,
      version: bundle.version,
    };
  }

  // ---------- Mobile : download FS avec progression ----------
  const download = FileSystem.createDownloadResumable(
    BUNDLE_URL,
    BUNDLE_PATH,
    {},
    (progress) => {
      const total = progress.totalBytesExpectedToWrite;
      const written = progress.totalBytesWritten;
      onProgress?.({
        bytesWritten: written,
        bytesTotal: total,
        ratio: total > 0 ? written / total : 0,
        phase: "downloading",
      });
    }
  );

  // Dans src/lib/quranBundle.ts, à l'intérieur de downloadBundle

    const result = await download.downloadAsync();
    if (!result?.uri) throw new Error("Téléchargement échoué.");

    const json = await FileSystem.readAsStringAsync(BUNDLE_PATH);
    console.log("[bundle] taille brute:", json.length);
    console.log("[bundle] 200 premiers caractères:", json.slice(0, 200));

    let bundle: { version: number; pages: unknown[] };
    try {
    bundle = JSON.parse(json);
    } catch (e) {
    console.error("[bundle] JSON invalide:", e);
    throw new Error("Le fichier téléchargé n'est pas un JSON valide.");
    }

    console.log("[bundle] version:", bundle.version);
    console.log("[bundle] pages.length:", bundle.pages?.length);
    console.log("[bundle] typeof bundle.pages:", typeof bundle.pages);

  // Distribution dans le cache individuel
  onProgress?.({ bytesWritten: 0, bytesTotal: 0, ratio: 0.9, phase: "caching" });
  await distributeBundle(bundle.pages);

  // Sauvegarde version
  await FileSystem.writeAsStringAsync(BUNDLE_VERSION_FILE, String(bundle.version));

  return {
    pages: bundle.pages.length,
    bytes: json.length,
    durationMs: Date.now() - start,
    version: bundle.version,
  };
}

/**
 * Distribue chaque page du bundle dans le cache individuel.
 * Le format écrit doit matcher ce qu'`apiFetch` lit : { data: pageData }.
 */
async function distributeBundle(pages: unknown[]): Promise<void> {
  await clearQuranCache();

  for (const page of pages) {
    const p = page as { page: number };
    if (typeof p?.page !== "number") continue;
    await setCachedPage(p.page, { data: p });
  }
}

// ---------- Re-check ----------

export async function checkForUpdates(): Promise<{
  needsUpdate: boolean;
  localVersion: number | null;
  remoteVersion: number | null;
}> {
  const localVersion = await getLocalBundleVersion();
  let remoteVersion: number | null = null;
  try {
    remoteVersion = await getRemoteBundleVersion();
  } catch {
    // ignore
  }
  return {
    needsUpdate: remoteVersion !== null && remoteVersion !== localVersion,
    localVersion,
    remoteVersion,
  };
}