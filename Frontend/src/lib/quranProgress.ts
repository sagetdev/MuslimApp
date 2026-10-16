import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";

const KEY = "muslimapp:quran:progress:v1";
const LEGACY_KEY = "muslimapp:quran:last-read:v1";

export type QuranProgress = {
  mode: "verses" | "pages";
  surah: number;
  verse: number;
  page: number;
};

let progress: QuranProgress = { mode: "verses", surah: 1, verse: 1, page: 1 };
let loadPromise: Promise<QuranProgress> | null = null;
let dirty = false;
let timer: ReturnType<typeof setTimeout> | null = null;

function sanitize(raw: Partial<QuranProgress> | null | undefined): QuranProgress {
  const int = (value: unknown, min: number, max: number, fallback: number) =>
    typeof value === "number" && Number.isFinite(value)
      ? Math.min(max, Math.max(min, Math.floor(value)))
      : fallback;

  return {
    mode: raw?.mode === "pages" ? "pages" : "verses",
    surah: int(raw?.surah, 1, 114, 1),
    verse: int(raw?.verse, 1, 286, 1),
    page: int(raw?.page, 1, 604, 1),
  };
}

/** Lecture synchrone du cache mémoire (valide après loadProgress). */
export function getProgress(): QuranProgress {
  return progress;
}

/** Charge la progression depuis le stockage, une seule fois par session. */
export function loadProgress(): Promise<QuranProgress> {
  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        let loaded: QuranProgress | null = null;

        if (raw) {
          loaded = sanitize(JSON.parse(raw));
        } else {
          // Migration de l'ancienne clé (dernière sourate/verset).
          const legacy = await AsyncStorage.getItem(LEGACY_KEY);
          if (legacy) loaded = sanitize(JSON.parse(legacy));
        }

        if (loaded && !dirty) progress = loaded;
      } catch {}
      return progress;
    })();
  }
  return loadPromise;
}

export async function flushProgress(): Promise<void> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (!dirty) return;
  dirty = false;
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(progress));
  } catch {}
}

/** Met à jour le cache mémoire tout de suite, écrit sur disque après 400 ms. */
export function saveProgress(patch: Partial<QuranProgress>): void {
  const next = sanitize({ ...progress, ...patch });
  if (
    next.mode === progress.mode &&
    next.surah === progress.surah &&
    next.verse === progress.verse &&
    next.page === progress.page
  ) {
    return;
  }

  progress = next;
  dirty = true;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void flushProgress(), 400);
}

// Écrit immédiatement quand l'app passe en arrière-plan ou se ferme.
AppState.addEventListener("change", (state) => {
  if (state !== "active") void flushProgress();
});