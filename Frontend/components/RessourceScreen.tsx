import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiFetch } from "../src/lib/api";
import { useAppTheme } from "../src/theme/ThemeProvider";
import createExploreStyles from "../src/styles/explore.styles";
import BackButton from "./BackButton";

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

type RecordValue = Record<string, unknown>;

function unwrapResponse(value: unknown): unknown {
  let current = value;
  for (let i = 0; i < 4; i += 1) {
    if (!current || typeof current !== "object" || Array.isArray(current) || !("data" in current)) break;
    current = (current as RecordValue).data;
  }
  return current;
}

function toRecords(value: unknown): RecordValue[] {
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

function getText(item: RecordValue, keys: string[]): string {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function getId(item: RecordValue, index: number): string {
  return getText(item, ["id", "_id", "number", "no", "slug", "key"]) || String(index + 1);
}

function getTitle(item: RecordValue, index: number): string {
  return getText(item, ["title", "name", "nameEnglish", "english", "translation", "collectionName", "bookName", "category"]) || `Ressource ${index + 1}`;
}

function getArabic(item: RecordValue): string {
  return getText(item, ARABIC_KEYS);
}

function getMeaning(item: RecordValue): string {
  return getText(item, ["translation", "meaning", "meaningEnglish", "englishMeaning", "text", "textEnglish", "text_english", "english", "description", "explanation", "hadithEnglish"]);
}

function humanize(key: string): string {
  return key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function labelFor(item: RecordValue, index: number): string {
  return getText(item, ["name", "title", "label", "category", "slug", "id"]) || `Catégorie ${index + 1}`;
}

function slugFor(item: RecordValue, index: number): string {
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

function categoryIconFor(label: string, slug: string, index: number): keyof typeof Ionicons.glyphMap {
  const normalized = normalizeCategoryText(`${label} ${slug.replace(/-/g, " ")}`);
  const match = categoryIconRules.find((rule) => rule.terms.some((term) => normalized.includes(normalizeCategoryText(term))));
  return match?.icon ?? fallbackCategoryIcons[index % fallbackCategoryIcons.length];
}

function ResourceValue({ value }: { value: unknown }) {
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

function buildHadith(item: RecordValue): HadithView {
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

function buildName(item: RecordValue, index = 0): NameView {
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

function Chip({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 14, paddingHorizontal: 11, paddingVertical: 8, backgroundColor: colors.surfaceAlt }}>
      <Ionicons name={icon} size={15} color={colors.primary} />
      <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "800" }}>{label}</Text>
    </View>
  );
}

function InfoBlock({ icon, label, text }: { icon: keyof typeof Ionicons.glyphMap; label: string; text: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
      <Ionicons name={icon} size={18} color={colors.primary} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "900" }}>{label}</Text>
        <Text style={{ color: colors.text, fontSize: 13, lineHeight: 20 }}>{text}</Text>
      </View>
    </View>
  );
}

function ArabicBlock({ text, large }: { text: string; large?: boolean }) {
  const { colors } = useAppTheme();
  if (!text) return null;
  return (
    <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: 20, paddingHorizontal: 17, paddingVertical: 22, gap: 8 }}>
      <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>TEXTE ARABE</Text>
      <Text style={{ color: colors.text, fontSize: large ? 34 : 27, lineHeight: large ? 55 : 48, textAlign: "right", writingDirection: "rtl" }}>{text}</Text>
    </View>
  );
}

function DetailShell({ eyebrow, title, onClose, onPrevious, onNext, children }: {
  eyebrow: string; title: string; onClose: () => void; onPrevious?: () => void; onNext?: () => void; children: ReactNode;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={{ borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 20, gap: 17 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={{ color: colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1.5 }}>{eyebrow}</Text>
          <Text style={{ color: colors.text, fontSize: 21, fontWeight: "800" }}>{title}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Fermer le détail" onPress={onClose} style={{ padding: 8, borderRadius: 12, backgroundColor: colors.surfaceAlt }}>
          <Ionicons name="close" size={20} color={colors.muted} />
        </Pressable>
      </View>
      {children}
      {onPrevious || onNext ? (
        <View style={{ flexDirection: "row", gap: 10, marginTop: 2 }}>
          {onPrevious ? (
            <Pressable accessibilityRole="button" onPress={onPrevious} style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 13, alignItems: "center" }}>
              <Text style={{ color: colors.text, fontWeight: "700" }}>Précédent</Text>
            </Pressable>
          ) : null}
          {onNext ? (
            <Pressable accessibilityRole="button" onPress={onNext} style={{ flex: 1, backgroundColor: colors.primary, borderRadius: 14, padding: 13, alignItems: "center" }}>
              <Text style={{ color: colors.primaryText, fontWeight: "800" }}>Suivant</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function SectionText({ label, text }: { label: string; text: string }) {
  const { colors } = useAppTheme();
  if (!text) return null;
  return (
    <View style={{ gap: 7 }}>
      <Text style={{ color: colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1.2 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 15, lineHeight: 25 }}>{text}</Text>
    </View>
  );
}

function ExtraDetails({ entries }: { entries: [string, unknown][] }) {
  const { colors } = useAppTheme();
  if (!entries.length) return null;
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 15, gap: 10 }}>
      <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "900", letterSpacing: 1.2 }}>INFORMATIONS COMPLÉMENTAIRES</Text>
      <ResourceValue value={Object.fromEntries(entries)} />
    </View>
  );
}

type DetailBaseProps = { item: RecordValue; onClose: () => void; onPrevious?: () => void; onNext?: () => void };

function HadithDetail({ item, onClose, onPrevious, onNext }: DetailBaseProps) {
  const { colors } = useAppTheme();
  const h = buildHadith(item);
  const referenceRows: { icon: keyof typeof Ionicons.glyphMap; label: string; text: string }[] = [
    { icon: "library-outline" as const, label: "Recueil", text: h.collection },
    { icon: "pricetag-outline" as const, label: "Numéro", text: h.number },
    { icon: "bookmark-outline" as const, label: "Livre / chapitre", text: h.book },
    { icon: "book-outline" as const, label: "Source / référence", text: h.source },
  ].filter((row) => row.text);
  return (
    <DetailShell eyebrow="LECTURE & RÉFLEXION" title={h.title} onClose={onClose} onPrevious={onPrevious} onNext={onNext}>
      {h.grade ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Chip icon="shield-checkmark-outline" label={h.grade} />
        </View>
      ) : null}
      <ArabicBlock text={h.arabic} />
      {h.narrator ? (
        <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 13 }}>
          <InfoBlock icon="people-outline" label="Rapporté par" text={h.narrator} />
        </View>
      ) : null}
      <SectionText label="TEXTE DU HADITH" text={h.meaning} />
      {h.hint ? (
        <View style={{ borderRadius: 18, padding: 15, backgroundColor: colors.surfaceAlt }}>
          <InfoBlock icon="shield-checkmark-outline" label="Que signifie ce degré ?" text={h.hint} />
        </View>
      ) : null}
      {h.explanation ? (
        <View style={{ borderRadius: 18, padding: 15, backgroundColor: colors.surfaceAlt }}>
          <InfoBlock icon="bulb-outline" label="À retenir" text={h.explanation} />
        </View>
      ) : null}
      {referenceRows.length ? (
        <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 13, gap: 12 }}>
          {referenceRows.map((row) => <InfoBlock key={row.label} icon={row.icon} label={row.label} text={row.text} />)}
        </View>
      ) : null}
      {!h.arabic && !h.meaning ? (
        <Text style={{ color: colors.muted, lineHeight: 22 }}>Aucun texte n’est fourni pour ce hadith.</Text>
      ) : null}
    </DetailShell>
  );
}

function NameDetail({ item, onClose, onPrevious, onNext }: DetailBaseProps) {
  const { colors } = useAppTheme();
  const n = buildName(item);
  return (
    <DetailShell eyebrow="APPRENDRE UN NOM" title={n.title} onClose={onClose} onPrevious={onPrevious} onNext={onNext}>
      {n.number ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Chip icon="ribbon-outline" label={`Nom n° ${n.number} sur 99`} />
        </View>
      ) : null}
      <ArabicBlock text={n.arabic} large />
      {n.latin && n.latin !== n.title ? <SectionText label="PRONONCIATION" text={n.latin} /> : null}
      <SectionText label="SIGNIFICATION" text={n.meaning} />
      {n.explanation ? (
        <View style={{ borderRadius: 18, padding: 15, backgroundColor: colors.surfaceAlt }}>
          <InfoBlock icon="bulb-outline" label="Pour mieux comprendre" text={n.explanation} />
        </View>
      ) : null}
      <ExtraDetails entries={n.extras} />
      {!n.arabic && !n.meaning ? (
        <Text style={{ color: colors.muted, lineHeight: 22 }}>Aucun détail n’est fourni pour ce nom.</Text>
      ) : null}
    </DetailShell>
  );
}

function DuaDetail({ item, kind, category, onClose, onPrevious, onNext }: {
  item: RecordValue;
  kind: ResourceKind;
  category?: string;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
}) {
  const { colors } = useAppTheme();
  const title = getTitle(item, 0);
  const arabic = getArabic(item);
  const meaning = getMeaning(item);
  const categoryLabel = category || getText(item, ["categoryName", "category_name", "category", "categoryTitle"]);
  const repetitions = getText(item, ["repetitions", "repeat", "repeatCount", "repeat_count", "repeatTimes", "repeat_times", "times", "count", "numberOfRepetitions"]);
  const reportedBy = getText(item, ["reportedBy", "reported_by", "narratedBy", "narrated_by", "narrator", "transmittedBy", "transmitted_by"]);
  const source = getText(item, ["source", "reference", "citation", "attribution", "hadithReference", "hadith_reference"]);
  const instruction = getText(item, ["instruction", "instructions", "usage", "howToUse", "how_to_use", "whenToSay", "when_to_say", "occasion"]);
  const metadataKeys = new Set(["category", "categoryName", "category_name", "categoryTitle", "repetitions", "repeat", "repeatCount", "repeat_count", "repeatTimes", "repeat_times", "times", "count", "numberOfRepetitions", "reportedBy", "reported_by", "narratedBy", "narrated_by", "narrator", "transmittedBy", "transmitted_by", "source", "reference", "citation", "attribution", "hadithReference", "hadith_reference", "instruction", "instructions", "usage", "howToUse", "how_to_use", "whenToSay", "when_to_say", "occasion"]);
  const excluded = new Set(["id", "_id", "title", "name", "nameEnglish", "english", "translation", "meaning", "meaningEnglish", "englishMeaning", "text", "textEnglish", "arabic", "arabicText", "textArabic", "text_ar", "text_arabic", "arabic_text", "nameArabic", "arabicName", "ar", "duaArabic", "dua_arabic", "hadithArabic", "dua", ...(kind === "duas" ? [...metadataKeys] : [])]);
  const details = Object.entries(item).filter(([key, value]) => !excluded.has(key) && value !== undefined && value !== null && value !== "");
  return (
    <View style={{ borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 20, gap: 17 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={{ color: colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1.5 }}>
            {kind === "names" ? "APPRENDRE UN NOM" : kind === "hadith" ? "LECTURE & RÉFLEXION" : "INVOCATION"}
          </Text>
          <Text style={{ color: colors.text, fontSize: 21, fontWeight: "800" }}>{title}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Fermer le détail" onPress={onClose} style={{ padding: 8, borderRadius: 12, backgroundColor: colors.surfaceAlt }}>
          <Ionicons name="close" size={20} color={colors.muted} />
        </Pressable>
      </View>
      {kind === "duas" && categoryLabel ? (
        <View style={{ flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 7, borderRadius: 14, paddingHorizontal: 11, paddingVertical: 8, backgroundColor: colors.surfaceAlt }}>
          <Ionicons name="pricetag-outline" size={15} color={colors.primary} />
          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "800" }}>{categoryLabel}</Text>
        </View>
      ) : null}
      {arabic ? (
        <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: 20, paddingHorizontal: 17, paddingVertical: 22, gap: 8 }}>
          <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>TEXTE ARABE</Text>
          <Text style={{ color: colors.text, fontSize: kind === "names" ? 34 : 27, lineHeight: kind === "names" ? 55 : 48, textAlign: "right", writingDirection: "rtl" }}>{arabic}</Text>
        </View>
      ) : null}
      {kind === "duas" && (instruction || repetitions) ? (
        <View style={{ borderRadius: 18, padding: 15, gap: 9, backgroundColor: colors.surfaceAlt }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="list-outline" size={18} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "900" }}>Instructions</Text>
          </View>
          {instruction ? <Text style={{ color: colors.text, fontSize: 14, lineHeight: 22 }}>{instruction}</Text> : null}
          {repetitions ? <Text style={{ color: colors.text, fontSize: 14, lineHeight: 22 }}>Répéter cette invocation {/^\d+$/.test(repetitions) ? repetitions + " fois" : repetitions}.</Text> : null}
        </View>
      ) : null}
      {kind === "duas" && (reportedBy || source) ? (
        <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 13, gap: 10 }}>
          {reportedBy ? (
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
              <Ionicons name="people-outline" size={18} color={colors.primary} style={{ marginTop: 1 }} />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "900" }}>Rapportée par</Text>
                <Text style={{ color: colors.text, fontSize: 13, lineHeight: 20 }}>{reportedBy}</Text>
              </View>
            </View>
          ) : null}
          {source ? (
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
              <Ionicons name="book-outline" size={18} color={colors.primary} style={{ marginTop: 1 }} />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "900" }}>Source / référence</Text>
                <Text style={{ color: colors.text, fontSize: 13, lineHeight: 20 }}>{source}</Text>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
      {meaning ? (
        <View style={{ gap: 7 }}>
          <Text style={{ color: colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1.2 }}>
            {kind === "names" ? "SIGNIFICATION" : kind === "hadith" ? "TRADUCTION / SENS" : "TRADUCTION"}
          </Text>
          <Text style={{ color: colors.text, fontSize: 15, lineHeight: 25 }}>{meaning}</Text>
        </View>
      ) : null}
      {details.length ? (
        <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 15 }}>
          <ResourceValue value={Object.fromEntries(details)} />
        </View>
      ) : null}
      {!arabic && !meaning && !details.length ? (
        <Text style={{ color: colors.muted, lineHeight: 22 }}>Aucun détail supplémentaire n’est fourni pour cette ressource.</Text>
      ) : null}
      {onPrevious || onNext ? (
        <View style={{ flexDirection: "row", gap: 10, marginTop: 2 }}>
          {onPrevious ? (
            <Pressable accessibilityRole="button" onPress={onPrevious} style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 13, alignItems: "center" }}>
              <Text style={{ color: colors.text, fontWeight: "700" }}>Précédent</Text>
            </Pressable>
          ) : null}
          {onNext ? (
            <Pressable accessibilityRole="button" onPress={onNext} style={{ flex: 1, backgroundColor: colors.primary, borderRadius: 14, padding: 13, alignItems: "center" }}>
              <Text style={{ color: colors.primaryText, fontWeight: "800" }}>Suivant</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function DetailCard(props: {
  item: RecordValue;
  kind: ResourceKind;
  category?: string;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
}) {
  if (props.kind === "hadith") return <HadithDetail {...props} />;
  if (props.kind === "names") return <NameDetail {...props} />;
  return <DuaDetail {...props} />;
}

export default function ResourceScreen({ config }: { config: ResourceConfig }) {
  const { colors } = useAppTheme();
  const styles = createExploreStyles(colors);
  const kind = config.kind ?? "generic";
  const [query, setQuery] = useState("");
  const [data, setData] = useState<unknown>(null);
  const [collections, setCollections] = useState<RecordValue[]>([]);
  const [categories, setCategories] = useState<unknown[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<{ label: string; slug: string } | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<{ label: string; slug: string } | null>(null);
  const [selectedItem, setSelectedItem] = useState<RecordValue | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const request = useCallback(async (endpoint: string, params?: Record<string, string | number>) => {
    const result = await apiFetch<unknown>(endpoint, params ? { params } : undefined);
    return unwrapResponse(result);
  }, []);

  const loadMain = useCallback(async (searchText = "") => {
    setLoading(true);
    setError(null);
    try {
      if (kind === "duas") {
        const result = await request(searchText.trim() ? "/duas/search" : "/duas/categories", searchText.trim() ? { q: searchText.trim(), limit: 50 } : undefined);
        if (searchText.trim()) {
          setSelectedCategory(null);
          setCategories([]);
          setData(result);
        } else {
          const raw = unwrapResponse(result);
          const array = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? Object.values(raw as RecordValue).find(Array.isArray) as unknown[] | undefined : undefined;
          setCategories(array ?? []);
          setData(null);
        }
      } else if (kind === "names") {
        setData(await request(searchText.trim() && config.searchEndpoint ? config.searchEndpoint : config.endpoint, searchText.trim() ? { [config.searchParam ?? "q"]: searchText.trim(), limit: 99 } : undefined));
      } else if (kind === "hadith") {
        if (searchText.trim()) {
          setData(await request(config.searchEndpoint ?? "/hadith/search", { q: searchText.trim(), limit: 40, ...(selectedCollection ? { collection: selectedCollection.slug } : {}) }));
        } else if (selectedCollection) {
          setData(await request(`/hadith/${encodeURIComponent(selectedCollection.slug)}`, { page: 1, limit: 40 }));
        } else {
          const rawCollections = await request("/hadith/collections");
          const raw = unwrapResponse(rawCollections);
          const array = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? Object.values(raw as RecordValue).find(Array.isArray) as unknown[] | undefined : undefined;
          const normalized = (array ?? []).map((item, index) => {
            if (typeof item === "string") return { id: item, name: item, slug: item, _index: index };
            return item && typeof item === "object" ? item as RecordValue : { id: String(index + 1), name: String(item) };
          });
          setCollections(normalized);
          setData(null);
        }
      } else {
        const result = searchText.trim() && config.searchEndpoint
          ? await request(config.searchEndpoint, { [config.searchParam ?? "q"]: searchText.trim(), limit: 25 })
          : await request(config.endpoint, config.includeTimezone ? { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" } : undefined);
        setData(result);
      }
      setLoaded(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Une erreur est survenue.");
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [config, kind, request, selectedCollection]);

  const loadCategory = useCallback(async (category: { label: string; slug: string }) => {
    setSelectedCategory(category);
    setSelectedItem(null);
    setLoading(true);
    setError(null);
    try {
      setData(await request(`/duas/category/${encodeURIComponent(category.slug)}`));
      setLoaded(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible de charger cette catégorie.");
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    void loadMain("");
  }, [loadMain]);

  const records = useMemo(() => toRecords(data), [data]);
  const selectedIndex = selectedItem ? records.findIndex((item) => item === selectedItem || getId(item, records.indexOf(item)) === getId(selectedItem, 0)) : -1;

  const chooseCollection = (item: RecordValue, index: number) => {
    const label = getTitle(item, index);
    const slug = getText(item, ["slug", "key", "collection", "name", "title", "id"]).toLowerCase().replace(/\\s+/g, "");
    if (!slug) return;
    setSelectedCollection({ label, slug });
    setSelectedItem(null);
    setQuery("");
  };

  const showCategories = kind === "duas" && !selectedCategory && !query.trim();
  const showCollections = kind === "hadith" && !selectedCollection && !query.trim();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <BackButton />
        <View style={styles.heading}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>MUSLIMAPP · APPRENDRE</Text>
          <Text style={[styles.title, { color: colors.text }]}>{config.title}</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>{config.subtitle}</Text>
        </View>

        <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 22, padding: 16, gap: 13 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={config.icon} size={23} color={colors.primary} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}>
                {showCategories ? "Choisis un thème" : showCollections ? "Choisis un recueil" : kind === "names" ? "Découvrir les noms" : selectedCategory?.label ?? selectedCollection?.label ?? "Explorer les ressources"}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
                {showCategories ? "Parcours les catégories disponibles et ouvre celles qui t’intéressent." : showCollections ? "Sélectionne une collection pour commencer la lecture." : kind === "names" ? "Ouvre une carte pour découvrir sa signification." : "Recherche dans les ressources disponibles."}
              </Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Actualiser" onPress={() => void loadMain(query)} style={{ padding: 7 }}>
              <Ionicons name="refresh-outline" size={21} color={colors.primary} />
            </Pressable>
          </View>
          {(config.searchEndpoint || kind === "duas") ? (
            <View style={[styles.searchBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Ionicons name="search-outline" size={19} color={colors.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={() => {
                  if (kind === "duas" && !query.trim()) void loadMain("");
                  else void loadMain(query);
                }}
                placeholder={kind === "names" ? "Rechercher un nom ou une signification" : kind === "hadith" ? "Rechercher un hadith" : "Rechercher une invocation"}
                placeholderTextColor={colors.muted}
                returnKeyType="search"
                style={[styles.searchInput, { color: colors.text }]}
              />
              {query.length > 0 ? <Pressable accessibilityRole="button" accessibilityLabel="Effacer la recherche" onPress={() => { setQuery(""); setSelectedCategory(null); setSelectedItem(null); void loadMain(""); }}><Ionicons name="close-circle" size={19} color={colors.muted} /></Pressable> : null}
              <Pressable accessibilityRole="button" accessibilityLabel="Lancer la recherche" onPress={() => void loadMain(query)} style={{ padding: 3 }}><Ionicons name="arrow-forward-circle" size={25} color={colors.primary} /></Pressable>
            </View>
          ) : null}
          {selectedCategory || selectedCollection ? (
            <Pressable accessibilityRole="button" onPress={() => {
              setSelectedCategory(null);
              setSelectedCollection(null);
              setSelectedItem(null);
              setQuery("");
              void loadMain("");
            }} style={{ flexDirection: "row", alignItems: "center", gap: 7, alignSelf: "flex-start", paddingVertical: 5 }}>
              <Ionicons name="arrow-back" size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 12 }}>Toutes les {kind === "duas" ? "catégories" : "collections"}</Text>
            </Pressable>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.feedback}><ActivityIndicator size="large" color={colors.primary} /><Text style={{ color: colors.muted }}>Préparation de tes ressources…</Text></View>
        ) : error ? (
          <View style={[styles.errorCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="cloud-offline-outline" size={30} color={colors.primary} />
            <Text style={[styles.errorTitle, { color: colors.text }]}>Impossible de charger les données</Text>
            <Text style={[styles.errorText, { color: colors.muted }]}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={() => void loadMain(query)} style={[styles.searchButton, { backgroundColor: colors.primary }]}><Text style={{ color: colors.primaryText, fontWeight: "800" }}>Réessayer</Text></Pressable>
          </View>
        ) : showCategories ? (
          <View style={{ gap: 13 }}>
            <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
              <Text style={{ color: colors.text, fontSize: 19, fontWeight: "800" }}>Catégories</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>{categories.length} thèmes</Text>
            </View>
            {categories.length ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 11 }}>
                {categories.map((raw, index) => {
                  const item = typeof raw === "string" ? { name: raw, slug: raw } : raw && typeof raw === "object" ? raw as RecordValue : { name: String(raw) };
                  const label = labelFor(item, index);
                  const slug = slugFor(item, index);
                  const description = getText(item, ["description", "subtitle", "count", "total"]);
                  const icon = categoryIconFor(label, slug, index);
                  return (
                    <Pressable key={slug + index} accessibilityRole="button" onPress={() => void loadCategory({ label, slug })} style={({ pressed }) => ({ width: "48%", flexGrow: 1, minHeight: 135, padding: 15, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: 12, opacity: pressed ? 0.78 : 1 })}>
                      <View style={{ width: 43, height: 43, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceAlt }}>
                        <Ionicons name={icon} size={22} color={colors.primary} />
                      </View>
                      <View style={{ gap: 4 }}>
                        <Text style={{ color: colors.text, fontWeight: "800", fontSize: 14 }}>{label}</Text>
                        {description ? <Text numberOfLines={2} style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>{description}</Text> : <Text style={{ color: colors.primary, fontSize: 11, fontWeight: "700" }}>Explorer les invocations</Text>}
                      </View>
                      <Ionicons name="arrow-forward" size={17} color={colors.primary} style={{ position: "absolute", right: 13, top: 15 }} />
                    </Pressable>
                  );
                })}
              </View>
            ) : <Text style={{ color: colors.muted }}>Aucune catégorie n’est renvoyée par l’API pour le moment.</Text>}
          </View>
        ) : showCollections ? (
          <View style={{ gap: 13 }}>
            <Text style={{ color: colors.text, fontSize: 19, fontWeight: "800" }}>Recueils de hadiths</Text>
            {collections.length ? (
              <View style={{ gap: 10 }}>
                {collections.map((item, index) => {
                  const label = getTitle(item, index);
                  const slug = getText(item, ["slug", "key", "collection", "name", "title", "id"]);
                  const description = getText(item, ["description", "author", "compiler", "hadithCount", "count"]);
                  return (
                    <Pressable key={slug || index} accessibilityRole="button" onPress={() => chooseCollection(item, index)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 13, padding: 16, borderRadius: 19, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.78 : 1 })}>
                      <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}><Ionicons name="book-outline" size={23} color={colors.primary} /></View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={{ color: colors.text, fontSize: 15, fontWeight: "800" }}>{label}</Text>
                        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>{description || "Ouvrir le recueil et parcourir les hadiths."}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={19} color={colors.primary} />
                    </Pressable>
                  );
                })}
              </View>
            ) : <Text style={{ color: colors.muted }}>Aucun recueil n’est renvoyé par l’API.</Text>}
          </View>
        ) : selectedItem ? (
          <DetailCard item={selectedItem} kind={kind} category={kind === "duas" ? selectedCategory?.label : undefined} onClose={() => setSelectedItem(null)} onPrevious={selectedIndex > 0 ? () => setSelectedItem(records[selectedIndex - 1]) : undefined} onNext={selectedIndex >= 0 && selectedIndex < records.length - 1 ? () => setSelectedItem(records[selectedIndex + 1]) : undefined} />
        ) : kind === "generic" && data !== null ? (
          <View style={{ gap: 12 }}>
            <Text style={{ color: colors.text, fontSize: 19, fontWeight: "800" }}>Informations</Text>
            <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 20, padding: 17 }}>
              <ResourceValue value={data} />
            </View>
          </View>
        ) : records.length ? (
          <View style={{ gap: 13 }}>
            <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
              <Text style={{ color: colors.text, fontSize: 19, fontWeight: "800" }}>{kind === "names" ? "Les beaux noms" : kind === "hadith" ? "Les enseignements" : selectedCategory ? selectedCategory.label : "Résultats"}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>{records.length} résultat{records.length > 1 ? "s" : ""}</Text>
            </View>
            {kind === "names" ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {records.map((item, index) => {
                  const nameCard = buildName(item, index);
                  return (
                  <Pressable key={getId(item, index)} accessibilityRole="button" onPress={() => setSelectedItem(item)} style={({ pressed }) => ({ width: "31%", flexGrow: 1, minHeight: 125, alignItems: "center", justifyContent: "center", padding: 10, gap: 8, borderRadius: 19, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.75 : 1 })}>
                    <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "800" }}>{nameCard.number || String(index + 1).padStart(2, "0")}</Text>
                    <Text numberOfLines={1} style={{ color: colors.text, fontSize: 25, lineHeight: 37, writingDirection: "rtl" }}>{nameCard.arabic || nameCard.title}</Text>
                    {nameCard.latin ? <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 11 }}>{nameCard.latin}</Text> : null}
                    <Text numberOfLines={2} style={{ color: colors.primary, textAlign: "center", fontSize: 11, fontWeight: "800" }}>{nameCard.meaning || nameCard.title}</Text>
                    <Ionicons name="arrow-forward-circle-outline" size={17} color={colors.muted} />
                  </Pressable>
                  );
                })}
              </View>
            ) : (
              <View style={{ gap: 11 }}>
                {records.map((item, index) => {
                  const hadith = kind === "hadith" ? buildHadith(item) : null;
                  const title = hadith ? hadith.title : getTitle(item, index);
                  const arabic = hadith ? hadith.arabic : getArabic(item);
                  const meaning = hadith ? hadith.meaning : getMeaning(item);
                  const reference = hadith
                    ? [hadith.narrator ? `Rapporté par ${hadith.narrator}` : "", hadith.grade].filter(Boolean).join(" · ")
                    : getText(item, ["reference", "source", "book", "hadithNumber", "number", "grade", "authenticity"]);
                  return (
                    <Pressable key={getId(item, index)} accessibilityRole="button" onPress={() => setSelectedItem(item)} style={({ pressed }) => ({ padding: 17, borderRadius: 21, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: 12, opacity: pressed ? 0.8 : 1 })}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
                        <View style={{ width: 35, height: 35, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceAlt }}><Ionicons name={kind === "hadith" ? "book-outline" : "heart-outline"} size={18} color={colors.primary} /></View>
                        <Text numberOfLines={2} style={{ color: colors.text, fontSize: 15, fontWeight: "800", flex: 1 }}>{title}</Text>
                        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                      </View>
                      {arabic ? <Text numberOfLines={3} style={{ color: colors.text, fontSize: 22, lineHeight: 39, textAlign: "right", writingDirection: "rtl" }}>{arabic}</Text> : null}
                      {meaning ? <Text numberOfLines={kind === "hadith" ? 4 : 3} style={{ color: colors.muted, fontSize: 13, lineHeight: 21 }}>{meaning}</Text> : null}
                      {reference ? <Text numberOfLines={1} style={{ color: colors.primary, fontSize: 11, fontWeight: "700" }}>{reference}</Text> : null}
                      <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "800" }}>Lire et approfondir →</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        ) : loaded ? (
          <View style={styles.feedback}>
            <Ionicons name="book-outline" size={28} color={colors.muted} />
            <Text style={{ color: colors.text, fontWeight: "800" }}>Aucun résultat</Text>
            <Text style={{ color: colors.muted, textAlign: "center", lineHeight: 21 }}>Essaie une autre recherche ou actualise les données.</Text>
          </View>
        ) : null}
        {kind === "generic" && data !== null && !records.length ? <ResourceValue value={data} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}
