import AsyncStorage from "@react-native-async-storage/async-storage";

export const DUA_FAVORITES_STORAGE_KEY = "muslimapp:duas:favorites:v1";

export type DuaFavorite = {
  id: string;
  title: string;
  arabic: string;
  meaning: string;
  category: string;
  target: number | null;
  item: Record<string, unknown>;
};

function textFrom(item: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = value as Record<string, unknown>;
      for (const nestedKey of ["name", "text", "title", "value"]) {
        const nestedValue = nested[nestedKey];
        if (typeof nestedValue === "string" && nestedValue.trim()) return nestedValue.trim();
      }
    }
  }
  return "";
}

function favoriteId(item: Record<string, unknown>): string {
  const sourceId = textFrom(item, ["id", "_id", "slug", "key", "duaId", "dua_id"]);
  if (sourceId) return sourceId;
  const signature = [
    textFrom(item, ["title", "name", "nameEnglish", "english", "translation", "meaning"]),
    textFrom(item, ["arabic", "arabicText", "textArabic", "text_ar", "text_arabic", "duaArabic", "dua"]),
  ].join("|");
  return signature || JSON.stringify(item);
}

export function toDuaFavorite(item: Record<string, unknown>, category = ""): DuaFavorite {
  const repetitions = textFrom(item, ["target", "goal", "repetitions", "repeat", "repeatCount", "repeat_count", "repeatTimes", "repeat_times", "times", "count", "numberOfRepetitions"]);
  const parsedTarget = /^\d+$/.test(repetitions) ? Number.parseInt(repetitions, 10) : null;
  return {
    id: favoriteId(item),
    title: textFrom(item, ["title", "name", "nameEnglish", "english", "translation", "meaning"]) || "Invocation",
    arabic: textFrom(item, ["arabic", "arabicText", "textArabic", "text_ar", "text_arabic", "arabic_text", "duaArabic", "dua_arabic", "ar", "dua"]),
    meaning: textFrom(item, ["translation", "meaning", "meaningEnglish", "englishMeaning", "textEnglish", "text_english", "english", "description"]),
    category: category || textFrom(item, ["categoryName", "category_name", "category", "categoryTitle"]),
    target: parsedTarget && parsedTarget > 0 ? parsedTarget : null,
    item,
  };
}

export async function readDuaFavorites(): Promise<DuaFavorite[]> {
  try {
    const raw = await AsyncStorage.getItem(DUA_FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is DuaFavorite =>
      Boolean(entry && typeof entry === "object" &&
        typeof (entry as DuaFavorite).id === "string" &&
        typeof (entry as DuaFavorite).title === "string" &&
        typeof (entry as DuaFavorite).item === "object")
    );
  } catch {
    return [];
  }
}

export async function saveDuaFavorite(item: Record<string, unknown>, category = ""): Promise<DuaFavorite[]> {
  const favorite = toDuaFavorite(item, category);
  const favorites = await readDuaFavorites();
  if (!favorites.some((entry) => entry.id === favorite.id)) {
    favorites.unshift(favorite);
    await AsyncStorage.setItem(DUA_FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  }
  return favorites;
}

export async function removeDuaFavorite(id: string): Promise<DuaFavorite[]> {
  const favorites = (await readDuaFavorites()).filter((entry) => entry.id !== id);
  await AsyncStorage.setItem(DUA_FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  return favorites;
}
