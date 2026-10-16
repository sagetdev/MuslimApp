import { Ionicons } from "@expo/vector-icons";
import { View, Text } from "react-native";
import { useAppTheme } from "../src/theme/ThemeProvider";
import createExploreStyles from "../src/styles/explore.styles";

export type ResourceKind = "generic" | "duas" | "names" | "hadith";

export type ResourceConfig = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  endpoint: string;
  searchEndpoint?: string;
  searchParam?: string;
  initialSearch?: boolean;
  includeTimezone?: boolean;
  kind?: ResourceKind;
};

export type RecordValue = Record<string, unknown>;

export function unwrapResponse(value: unknown): unknown {
  let current = value;
  for (let i = 0; i < 4; i += 1) {
    if (!current || typeof current !== "object" || Array.isArray(current) || !("data" in current)) break;
    current = (current as RecordValue).data;
  }
  return current;
}

export function toRecords(value: unknown): RecordValue[] {
  const unwrapped = unwrapResponse(value);
  if (Array.isArray(unwrapped)) return unwrapped.filter((item): item is RecordValue => !!item && typeof item === "object");
  if (!unwrapped || typeof unwrapped !== "object") return [];
  const object = unwrapped as RecordValue;
  for (const key of ["items", "results", "duas", "dua", "names", "asma", "hadiths", "hadith", "collections", "categories", "records"]) {
    if (Array.isArray(object[key])) {
      return (object[key] as unknown[]).filter((item): item is RecordValue => !!item && typeof item === "object");
    }
  }
  return [object];
}

export function getText(item: RecordValue, keys: string[]): string {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

export function getId(item: RecordValue, index: number): string {
  return getText(item, ["id", "_id", "number", "no", "slug", "key"]) || String(index + 1);
}

export function getTitle(item: RecordValue, index: number): string {
  return getText(item, ["title", "name", "nameEnglish", "english", "translation", "collectionName", "bookName", "category"]) || `Ressource ${index + 1}`;
}

export function getArabic(item: RecordValue): string {
  return getText(item, ARABIC_KEYS);
}

export function getMeaning(item: RecordValue): string {
  return getText(item, ["translation", "meaning", "meaningEnglish", "englishMeaning", "text", "textEnglish", "text_english", "english", "description", "explanation", "hadithEnglish"]);
}

export function humanize(key: string): string {
  return key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function labelFor(item: RecordValue, index: number): string {
  return getText(item, ["name", "title", "label", "category", "slug", "id"]) || `Catégorie ${index + 1}`;
}

export function slugFor(item: RecordValue, index: number): string {
  // UmmahAPI category identifiers use stable IDs such as "morning";
  // display names such as "Morning Adhkar" are not valid category routes.
  const raw = getText(item, ["slug", "key", "id", "_id", "category", "name", "title"]) || String(index + 1);
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const fallbackCategoryIcons: (keyof typeof Ionicons.glyphMap)[] = [
  "sparkles-outline", "compass-outline", "chatbubble-ellipses-outline", "leaf-outline",
  "star-outline", "hand-left-outline", "water-outline", "flower-outline",
  "cloud-outline", "footsteps-outline", "gift-outline", "book-outline",
];

const categoryIconRules: Array<{ terms: string[]; icon: keyof typeof Ionicons.glyphMap }> = [
  { terms: ["matin", "morning", "fajr", "aube", "sunrise"], icon: "sunny-outline" },
  { terms: ["soir", "evening", "nuit", "night", "coucher", "sommeil", "sleep", "dormir"], icon: "moon-outline" },
  { terms: ["priere", "prayer", "salah", "salat", "adhan", "adhan", "mosquee", "mosque"], icon: "time-outline" },
  { terms: ["protection", "protect", "refuge", "evil", "mal"], icon: "shield-checkmark-outline" },
  { terms: ["pardon", "forgiveness", "repent", "istighfar", "peche", "sin"], icon: "heart-outline" },
  { terms: ["maison", "home", "foyer", "house"], icon: "home-outline" },
  { terms: ["voyage", "travel", "route", "transport", "voiture", "car", "deplacement"], icon: "car-outline" },
  { terms: ["repas", "manger", "food", "eat", "nourriture", "boire", "drink"], icon: "restaurant-outline" },
  { terms: ["ablution", "wudu", "eau", "water", "purification"], icon: "water-outline" },
  { terms: ["sante", "maladie", "illness", "health", "guerison", "healing", "medecin"], icon: "medkit-outline" },
  { terms: ["parents", "famille", "family", "enfant", "children", "proches"], icon: "people-outline" },
  { terms: ["gratitude", "remerciement", "merci", "thank", "louange", "praise"], icon: "gift-outline" },
  { terms: ["stress", "angoisse", "anxiete", "anxiety", "tristesse", "sadness", "difficulte"], icon: "cloud-outline" },
  { terms: ["invocation", "dua", "dhikr", "rappel", "remembrance"], icon: "chatbubble-ellipses-outline" },
  { terms: ["jeune", "ramadan", "fasting", "iftar", "suhoor"], icon: "restaurant-outline" },
  { terms: ["hajj", "omra", "umrah", "pelerinage", "pilgrimage", "kaaba"], icon: "compass-outline" },
  { terms: ["lecture", "coran", "quran", "livre", "book"], icon: "book-outline" },
  { terms: ["reussite", "examen", "etude", "travail", "success", "study"], icon: "school-outline" },
];

function normalizeCategoryText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function categoryIconFor(label: string, slug: string, index: number): keyof typeof Ionicons.glyphMap {
  const normalized = normalizeCategoryText(`${label} ${slug.replace(/-/g, " ")}`);
  const match = categoryIconRules.find((rule) => rule.terms.some((term) => normalized.includes(normalizeCategoryText(term))));
  return match?.icon ?? fallbackCategoryIcons[index % fallbackCategoryIcons.length];
}

export function ResourceValue({ value }: { value: unknown }) {
  const { colors } = useAppTheme();
  const styles = createExploreStyles(colors);
  if (value === null || value === undefined || value === "") return null;
  if (["string", "number", "boolean"].includes(typeof value)) {
    return <Text style={[styles.valueText, { color: colors.text }]}>{String(value)}</Text>;
  }
  if (Array.isArray(value)) {
    return (
      <View style={{ gap: 8 }}>
        {value.slice(0, 30).map((item, index) => (
          <View key={`value-${index}`} style={[styles.dataCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <ResourceValue value={item} />
          </View>
        ))}
      </View>
    );
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as RecordValue).filter(([, child]) => child !== undefined && child !== null && child !== "");
    return (
      <View style={{ gap: 12 }}>
        {entries.map(([key, child]) => (
          <View key={key} style={{ gap: 5 }}>
            <Text style={[styles.fieldLabel, { color: colors.primary }]}>{humanize(key)}</Text>
            <ResourceValue value={child} />
          </View>
        ))}
      </View>
    );
  }
  return null;
}


// ---------- Hadiths & 99 noms : lecture structurée ----------
const ARABIC_RE = /[\u0600-\u06FF]/;

const ARABIC_KEYS = ["arabic", "arabicText", "textArabic", "text_ar", "text_arabic", "arabic_text", "nameArabic", "arabicName", "ar", "duaArabic", "dua_arabic", "hadithArabic", "dua"];
const NARRATOR_KEYS = ["reportedBy", "reported_by", "narratedBy", "narrated_by", "narrator", "transmittedBy", "transmitted_by"];
const HADITH_TEXT_KEYS = ["translation", "meaning", "text", "textEnglish", "text_english", "english", "hadithEnglish", "body", "content"];
const EXPLANATION_KEYS = ["explanation", "commentary", "lesson", "lessons", "benefit", "benefits", "takeaway", "reflection", "note", "notes", "significance", "summary", "description", "details", "usage"];
const TECHNICAL_KEY_RE = /^(id|_id|__v|slug|key|index|_index|createdAt|updatedAt|created_at|updated_at|url|link|urn)$/i;

function looseText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(looseText).filter(Boolean).join(" · ");
  if (value && typeof value === "object") {
    const object = value as RecordValue;
    const grade = looseText(object.grade);
    if (grade) {
      const by = looseText(object.graded_by ?? object.gradedBy ?? object.scholar ?? object.by);
      return by ? `${grade} (${by})` : grade;
    }
    for (const key of ["name", "text", "value", "title"]) {
      const text = looseText(object[key]);
      if (text) return text;
    }
  }
  return "";
}

function pickLoose(item: RecordValue, keys: string[], used: Set<string>): string {
  for (const key of keys) {
    const text = looseText(item[key]);
    if (text) {
      used.add(key);
      return text;
    }
  }
  return "";
}

function extrasOf(item: RecordValue, used: Set<string>): [string, unknown][] {
  return Object.entries(item).filter(
    ([key, value]) => !used.has(key) && !TECHNICAL_KEY_RE.test(key) && value !== undefined && value !== null && value !== "",
  );
}

function splitNarrator(text: string): { narrator: string; body: string } {
  const match = text.match(/^\s*Narrated\s+([^:\n]{2,80}?)\s*:\s*([\s\S]+)$/i);
  return match ? { narrator: match[1].trim(), body: match[2].trim() } : { narrator: "", body: text };
}

function gradeHint(grade: string): string {
  const g = grade.toLowerCase();
  if (g.includes("sahih") && g.includes("hasan")) return "Combine les degrés « bon » et « authentique » : un hadith considéré comme fiable.";
  if (g.includes("sahih") || g.includes("authentic")) return "Authentique : transmis par une chaîne continue de rapporteurs fiables et précis.";
  if (g.includes("hasan")) return "Bon : fiable, avec un degré de précision légèrement inférieur à « authentique ».";
  if (g.includes("mawdu") || g.includes("fabricated")) return "Inventé : ne peut pas être attribué au Prophète ﷺ.";
  if (g.includes("daif") || g.includes("da'if") || g.includes("da’if") || g.includes("weak")) return "Faible : la chaîne de transmission présente une faiblesse.";
  return "";
}

type HadithView = {
  title: string; arabic: string; meaning: string; narrator: string; collection: string;
  number: string; book: string; source: string; grade: string; hint: string;
  explanation: string; extras: [string, unknown][];
};

export function buildHadith(item: RecordValue): HadithView {
  const used = new Set<string>();
  const collectionRaw = pickLoose(item, ["collectionName", "collection_name", "collection", "bookName", "book_name"], used);
  const collection = collectionRaw ? humanize(collectionRaw) : "";
  const number = pickLoose(item, ["hadithNumber", "hadith_number", "hadith_no", "number", "idInBook", "id_in_book"], used);
  const book = pickLoose(item, ["book", "bookTitle", "book_title", "kitab", "chapter", "chapterTitle", "chapter_title", "bab", "section"], used);
  let arabic = pickLoose(item, ARABIC_KEYS, used);
  let meaning = pickLoose(item, HADITH_TEXT_KEYS, used);
  if (meaning && !arabic && ARABIC_RE.test(meaning)) {
    arabic = meaning;
    meaning = "";
  }
  let narrator = pickLoose(item, NARRATOR_KEYS, used);
  if (!narrator && meaning) {
    const split = splitNarrator(meaning);
    narrator = split.narrator;
    meaning = split.body;
  }
  const source = pickLoose(item, ["source", "reference", "citation", "attribution", "hadithReference", "hadith_reference"], used);
  const grade = pickLoose(item, ["grade", "grades", "authenticity", "ruling", "gradeText"], used);
  const explanation = pickLoose(item, EXPLANATION_KEYS, used);
  const heading = collection ? `${collection}${number ? ` · n° ${number}` : ""}` : "";
  const title = heading || pickLoose(item, ["title", "chapterTitle", "chapter_title"], new Set()) || (book ? book : "Hadith");
  return { title, arabic, meaning, narrator, collection, number, book, source, grade, hint: grade ? gradeHint(grade) : "", explanation, extras: extrasOf(item, used) };
}

type NameView = {
  title: string; arabic: string; latin: string; meaning: string; explanation: string;
  number: string; extras: [string, unknown][];
};

export function buildName(item: RecordValue, index = 0): NameView {
  const used = new Set<string>();
  const numberRaw = pickLoose(item, ["number", "no", "id", "index", "order"], used);
  const number = /^\d{1,3}$/.test(numberRaw) ? numberRaw : "";
  let arabic = pickLoose(item, ARABIC_KEYS, used);
  let latin = "";
  for (const key of ["transliteration", "transliterated", "latin", "nameTransliteration", "name_transliteration", "pronunciation", "romanization", "romanized", "name", "nameEnglish", "title"]) {
    const text = looseText(item[key]);
    if (!text) continue;
    used.add(key);
    if (ARABIC_RE.test(text)) {
      if (!arabic) arabic = text;
    } else if (!latin) {
      latin = text;
    }
  }
  let meaning = pickLoose(item, ["meaning", "meaningEnglish", "englishMeaning", "translation", "english", "text", "textEnglish", "text_english"], used);
  if (meaning === latin) meaning = "";
  let explanation = pickLoose(item, EXPLANATION_KEYS, used);
  if (explanation === meaning) explanation = "";
  if (!meaning && explanation) {
    meaning = explanation;
    explanation = "";
  }
  const title = latin || meaning || `Nom ${number || index + 1}`;
  return { title, arabic, latin, meaning, explanation, number, extras: extrasOf(item, used) };
}
