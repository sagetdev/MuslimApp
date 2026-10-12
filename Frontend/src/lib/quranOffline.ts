// src/lib/quranOffline.ts
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

type OfflineBundle = { version: number; pages: { page: number }[] };

let loadPromise: Promise<Map<number, unknown>> | null = null;

async function readBundleText(): Promise<string> {
  const asset = Asset.fromModule(require("../../assets/quran/quran-all.qbundle"));

  if (Platform.OS === "web") {
    const response = await fetch(asset.uri);
    return response.text();
  }

  if (!asset.localUri) await asset.downloadAsync();
  return FileSystem.readAsStringAsync(asset.localUri ?? asset.uri);
}

function load(): Promise<Map<number, unknown>> {
  if (!loadPromise) {
    loadPromise = (async () => {
      const map = new Map<number, unknown>();
      const bundle = JSON.parse(await readBundleText()) as OfflineBundle;
      for (const page of bundle.pages) {
        if (typeof page?.page === "number") map.set(page.page, page);
      }
      return map;
    })().catch((error) => {
      loadPromise = null;
      console.warn("[quranOffline] chargement impossible:", error);
      return new Map<number, unknown>();
    });
  }
  return loadPromise;
}

/** Lance le chargement en mémoire (une seule fois par session). */
export async function preloadOfflineQuran(): Promise<void> {
  await load();
}

/** Renvoie la page au format { data: page } attendu par apiFetch, ou null. */
export async function getOfflinePage<T = unknown>(page: number): Promise<T | null> {
  const map = await load();
  const found = map.get(page);
  return found ? ({ data: found } as T) : null;
}