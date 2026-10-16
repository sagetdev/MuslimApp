import AsyncStorage from "@react-native-async-storage/async-storage";

// Même clé que l'écran Prière historique : les préférences déjà enregistrées restent valides.
export const PRAYER_PREFS_KEY = "muslimapp:prayer-preferences:v1";

export type PrayerPrefs = { method: string; madhab: "shafi" | "hanafi" };

export const DEFAULT_PRAYER_PREFS: PrayerPrefs = { method: "MWL", madhab: "shafi" };

export const PRAYER_METHODS = [
  { label: "Muslim World League", value: "MWL" },
  { label: "Umm Al-Qura", value: "UmmAlQura" },
  { label: "Égyptienne", value: "Egyptian" },
  { label: "Karachi", value: "Karachi" },
  { label: "Amérique du Nord (ISNA)", value: "ISNA" },
] as const;

export const MADHABS = [
  { label: "Shafi'i", value: "shafi" },
  { label: "Hanafi", value: "hanafi" },
] as const;

export async function loadPrayerPrefs(): Promise<PrayerPrefs> {
  try {
    const raw = await AsyncStorage.getItem(PRAYER_PREFS_KEY);
    if (!raw) return DEFAULT_PRAYER_PREFS;
    const parsed = JSON.parse(raw) as Partial<PrayerPrefs>;
    return {
      method: PRAYER_METHODS.some((m) => m.value === parsed.method) ? (parsed.method as string) : DEFAULT_PRAYER_PREFS.method,
      madhab: parsed.madhab === "hanafi" ? "hanafi" : "shafi",
    };
  } catch {
    return DEFAULT_PRAYER_PREFS;
  }
}

export async function savePrayerPrefs(prefs: PrayerPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(PRAYER_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Non bloquant : la préférence reste valable pour la session en cours.
  }
}
