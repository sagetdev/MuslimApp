// src/lib/quranTextOffline.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

const BUNDLE_VERSION = 1;
const CACHE_PREFIX = "muslimapp:quran:surah:v1:";
const BUNDLE_ASSET = require("../../assets/quran/quran-text.qbundle");

type TextBundle = {
  version: number;
  surahs: Array<{ number: number; data: unknown }>;
};

let bundlePromise: Promise<Map<number, unknown>> | null = null;

async function readBundle(): Promise<string> {
  const asset = Asset.fromModule(BUNDLE_ASSET);

  if (Platform.OS === "web") {
    const response = await fetch(asset.uri);
    if (!response.ok) throw new Error("Impossible de lire le bundle du Coran.");
    return response.text();
  }

  if (!asset.localUri) await asset.downloadAsync();
  return FileSystem.readAsStringAsync(asset.localUri ?? asset.uri);
}

async function loadBundle(): Promise<Map<number, unknown>> {
  if (!bundlePromise) {
    bundlePromise = (async () => {
      const parsed = JSON.parse(await readBundle()) as TextBundle;
      if (parsed.version !== BUNDLE_VERSION || !Array.isArray(parsed.surahs)) {
        throw new Error("Version du bundle texte du Coran incompatible.");
      }

      const surahs = new Map<number, unknown>();
      for (const item of parsed.surahs) {
        if (Number.isInteger(item.number) && item.number >= 1 && item.number <= 114) {
          surahs.set(item.number, item.data);
        }
      }
      return surahs;
    })().catch((error) => {
      bundlePromise = null;
      console.warn("[quranTextOffline] Bundle indisponible :", error);
      return new Map<number, unknown>();
    });
  }

  return bundlePromise;
}

/** Données intégrées au build. Retourne le même enveloppement que l'API ({ data }). */
export async function getBundledSurah(number: number): Promise<unknown | null> {
  const surahs = await loadBundle();
  const data = surahs.get(number);
  return data === undefined ? null : { data };
}

/** Cache persistant pour les réponses obtenues après le build. */
export async function getCachedSurah(number: number): Promise<unknown | null> {
  try {
    const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${number}`);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

export async function setCachedSurah(number: number, response: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(`${CACHE_PREFIX}${number}`, JSON.stringify(response));
  } catch (error) {
    if (__DEV__) console.warn("[quranTextOffline] Cache non enregistré :", error);
  }
}

/** Précharge le bundle en mémoire sans requête réseau. */
export async function preloadQuranText(): Promise<void> {
  await loadBundle();
}
