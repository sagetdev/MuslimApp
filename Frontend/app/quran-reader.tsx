import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Slider from "@react-native-community/slider";
import { getOfflinePage } from "../src/lib/quranOffline";
import QuranPage from "../components/QuranPage";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apiFetch } from "../src/lib/api";
import { useAppTheme } from "../src/theme/ThemeProvider";

type Surah = {
  number?: number;
  id?: number;
  name?: string;
  englishName?: string;
  english_name?: string;
  name_english?: string;
  name_translation?: string;
  name_arabic?: string;
  verses_count?: number;
  verses?: unknown[];
  ayahs?: unknown[];
};

const FAVORITES_KEY = "muslimapp:quran:favorites:v1";
const LAST_READ_KEY = "muslimapp:quran:last-read:v1";

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function firstText(obj: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" || typeof v === "number") return String(v);
  }
  return "";
}

function extractSurah(value: unknown): Surah {
  const root = objectValue(value);
  const data = objectValue(root.data);
  const nested = objectValue(data.surah ?? data);
  return nested as Surah;
}

function extractVerses(surah: Surah): Record<string, unknown>[] {
  const list = Array.isArray(surah.verses)
    ? surah.verses
    : Array.isArray(surah.ayahs)
    ? surah.ayahs
    : [];
  return list.map(objectValue);
}

export default function QuranReaderScreen() {
  const { colors } = useAppTheme();
  const params = useLocalSearchParams<{ surah?: string | string[] }>();
  const router = useRouter();
  const initial = Array.isArray(params.surah) ? params.surah[0] : params.surah;
  const [input, setInput] = useState(initial ?? "1");
  const [surah, setSurah] = useState<Surah | null>(null);
  const [verses, setVerses] = useState<Record<string, unknown>[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [translation, setTranslation] = useState(true);
  const [fontSize, setFontSize] = useState(28);
  const [selectedVerse, setSelectedVerse] = useState(0);
  const [readingMode, setReadingMode] = useState<"verses" | "pages">("verses");
  const [pageNumber, setPageNumber] = useState(1);
  const [pageData, setPageData] = useState<Record<string, unknown> | null>(null);
  const [pageLoading, setPageLoading] = useState(false);
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    void AsyncStorage.getItem(FAVORITES_KEY).then((raw) => {
      if (raw) {
        try {
          setFavorites(JSON.parse(raw) as number[]);
        } catch {}
      }
    });
  }, []);

  const loadSurah = useCallback(async (number: number) => {
    if (!Number.isInteger(number) || number < 1 || number > 114) {
      setError("Entre un numéro de sourate entre 1 et 114.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await apiFetch<unknown>(`/quran/surahs/${number}`);
      const parsed = extractSurah(result);
      // L’API place les métadonnées dans data.surah et les versets dans data.verses.
      const data = objectValue(objectValue(result).data);
      const ayahs = extractVerses(data);
      if (!ayahs.length) {
        throw new Error("Cette sourate ne contient pas de versets lisibles dans la réponse du serveur.");
      }
      setSurah(parsed);
      setVerses(ayahs);
      setSelectedVerse(0);
      setInput(String(number));
      await AsyncStorage.setItem(
        LAST_READ_KEY,
        JSON.stringify({ surah: number, verse: 1, updatedAt: new Date().toISOString() })
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger la sourate.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSurah(Number(initial || 1));
  }, [initial, loadSurah]);


  const loadLocalPage = useCallback(async (page: number) => {
    const safePage = Math.max(1, Math.min(604, Math.round(page)));
    setPageNumber(safePage);
    setPageLoading(true);
    setPageError("");
    try {
      // Le mode Mushaf lit exclusivement le bundle embarqué dans l'application.
      // Aucun appel à l'API serveur n'est effectué pour charger une page.
      const result = await getOfflinePage<unknown>(safePage);
      const root = objectValue(result);
      const data = objectValue(root.data ?? result);
      if (!Object.keys(data).length) {
        throw new Error("Cette page n'est pas présente dans le Coran embarqué. Vérifie la génération des assets avant le build.");
      }
      setPageData(data);
    } catch (e) {
      setPageData(null);
      setPageError(e instanceof Error ? e.message : "Impossible de lire la page hors ligne.");
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    if (readingMode === "pages") void loadLocalPage(pageNumber);
  }, [readingMode, pageNumber, loadLocalPage]);

  const pageLines = useMemo(() => {
    const source = pageData;
    if (!source) return [] as unknown[];
    const candidates = [source.lines, source.verses, source.ayahs, source.words];
    const found = candidates.find(Array.isArray);
    return Array.isArray(found) ? found : [];
  }, [pageData]);

  function getPageLineText(value: unknown): string {
    if (typeof value === "string" || typeof value === "number") return String(value);
    const line = objectValue(value);
    return firstText(line, ["text", "text_uthmani", "arabic", "textArabic", "content", "words"]);
  }

  const styles = useMemo(
    () => ({
      page: { flex: 1, backgroundColor: colors.background },
      card: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 20,
        padding: 16,
        gap: 12,
      },
      text: { color: colors.text },
      muted: { color: colors.muted },
      action: {
        backgroundColor: colors.primary,
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 15,
        alignItems: "center" as const,
        justifyContent: "center" as const,
      },
    }),
    [colors]
  );

  const toggleFavorite = async (index: number) => {
    const id = Number(surah?.number ?? surah?.id ?? Number(input)) * 1000 + index + 1;
    const next = favorites.includes(id) ? favorites.filter((item) => item !== id) : [...favorites, id];
    setFavorites(next);
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  };

  if (readingMode === "pages") {
    return (
      <QuranPage
        initialPage={pageNumber}
        offline
        onClose={() => setReadingMode("verses")}
      />
    );
  }

  return (
    <SafeAreaView style={styles.page} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 40,
          gap: 18,
          maxWidth: 900,
          width: "100%",
          alignSelf: "center",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable onPress={() => router.back()} accessibilityLabel="Retour" style={{ padding: 8 }}>
            <Ionicons name="arrow-back" size={23} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ color: colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1.7 }}>
              LECTURE DU CORAN
            </Text>
            <Text style={{ color: colors.text, fontSize: 28, fontWeight: "800" }}>
              Le Saint Coran
            </Text>
          </View>
        </View>


        <View style={[styles.card, { gap: 10 }]}>
          <Text style={[styles.text, { fontWeight: "800", fontSize: 16 }]}>Mode de lecture</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={() => setReadingMode("verses")}
              accessibilityRole="button"
              accessibilityState={{ selected: readingMode === "verses" }}
              style={[styles.action, { flex: 1, backgroundColor: readingMode === "verses" ? colors.primary : colors.surfaceAlt }]}
            >
              <Text style={{ color: readingMode === "verses" ? colors.primaryText : colors.text, fontWeight: "800" }}>
                Versets + traduction
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setReadingMode("pages")}
              accessibilityRole="button"
              accessibilityState={{ selected: readingMode === "pages" }}
              style={[styles.action, { flex: 1, backgroundColor: readingMode === "pages" ? colors.primary : colors.surfaceAlt }]}
            >
              <Text style={{ color: readingMode === "pages" ? colors.primaryText : colors.text, fontWeight: "800" }}>
                Mushaf — pages
              </Text>
            </Pressable>
          </View>
          <Text style={[styles.muted, { fontSize: 12, lineHeight: 18 }]}>
            {readingMode === "pages"
              ? "Lecture des pages du Mushaf depuis les ressources intégrées à l'application, sans requête Quran au serveur."
              : "Lecture sourate par sourate avec le texte arabe et la traduction disponible."}
          </Text>
        </View>

        <View style={[styles.card, { flexDirection: "row", alignItems: "center" }]}>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={[styles.text, { fontSize: 18, fontWeight: "800" }]}>
              {surah
                ? firstText(surah as Record<string, unknown>, ["englishName", "english_name", "name_english", "name"]) ||
                  `Sourate ${input}`
                : "Choisir une sourate"}
            </Text>
            <Text style={[styles.muted, { fontSize: 12 }]}>
              Reprise de lecture enregistrée automatiquement
            </Text>
          </View>
          <TextInput
            accessibilityLabel="Numéro de sourate"
            value={input}
            onChangeText={setInput}
            keyboardType="number-pad"
            maxLength={3}
            style={{
              color: colors.text,
              backgroundColor: colors.surfaceAlt,
              borderRadius: 12,
              width: 58,
              textAlign: "center",
              padding: 10,
              fontWeight: "800",
            }}
          />
          <Pressable onPress={() => void loadSurah(Number(input))} style={styles.action}>
            <Text style={{ color: colors.primaryText, fontWeight: "800" }}>Ouvrir</Text>
          </Pressable>
        </View>


        {readingMode === "pages" ? (
          <View style={[styles.card, { gap: 14 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={[styles.text, { fontWeight: "800", fontSize: 17 }]}>Mushaf hors ligne</Text>
              <Text style={[styles.muted, { fontSize: 12 }]}>Page {pageNumber} / 604</Text>
            </View>
            <Slider
              minimumValue={1}
              maximumValue={604}
              step={1}
              value={pageNumber}
              onSlidingComplete={(value) => void loadLocalPage(value)}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.primary}
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                disabled={pageNumber <= 1 || pageLoading}
                onPress={() => void loadLocalPage(pageNumber - 1)}
                style={[styles.action, { flex: 1, opacity: pageNumber <= 1 ? 0.45 : 1 }]}
              >
                <Text style={{ color: colors.primaryText, fontWeight: "800" }}>Page précédente</Text>
              </Pressable>
              <Pressable
                disabled={pageNumber >= 604 || pageLoading}
                onPress={() => void loadLocalPage(pageNumber + 1)}
                style={[styles.action, { flex: 1, opacity: pageNumber >= 604 ? 0.45 : 1 }]}
              >
                <Text style={{ color: colors.primaryText, fontWeight: "800" }}>Page suivante</Text>
              </Pressable>
            </View>
            {pageLoading ? <ActivityIndicator color={colors.primary} size="large" /> : pageError ? (
              <Text style={{ color: "#E57373", lineHeight: 21 }}>{pageError}</Text>
            ) : pageLines.length ? (
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ width: "100%" }}
              >
                <View style={{
                  width: "100%",
                  minHeight: 420,
                  justifyContent: "center",
                  padding: 18,
                  gap: 16,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceAlt,
                }}>
                  {pageLines.map((line, index) => {
                    const text = getPageLineText(line);
                    return text ? (
                      <Text key={index} style={{
                        color: colors.text,
                        fontSize: 24,
                        lineHeight: 42,
                        textAlign: "center",
                        writingDirection: "rtl",
                      }}>{text}</Text>
                    ) : null;
                  })}
                </View>
              </ScrollView>
            ) : (
              <Text style={[styles.muted, { lineHeight: 20 }]}>
                Le format des données de cette page n'est pas reconnu. Vérifie le contenu de assets/quran/quran-all.qbundle.
              </Text>
            )}
          </View>
        ) : null}

        {readingMode === "verses" ? <View style={[styles.card, { gap: 14 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={[styles.text, { fontWeight: "800", fontSize: 16 }]}>Lecture</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                accessibilityLabel="Diminuer la taille du texte"
                onPress={() => setFontSize((v) => Math.max(22, v - 2))}
                style={{ padding: 6 }}
              >
                <Ionicons name="remove-circle-outline" size={23} color={colors.primary} />
              </Pressable>
              <Pressable
                accessibilityLabel="Augmenter la taille du texte"
                onPress={() => setFontSize((v) => Math.min(42, v + 2))}
                style={{ padding: 6 }}
              >
                <Ionicons name="add-circle-outline" size={23} color={colors.primary} />
              </Pressable>
              <Pressable
                accessibilityLabel="Afficher ou masquer la traduction"
                onPress={() => setTranslation((v) => !v)}
                style={{ padding: 6 }}
              >
                <Ionicons name="language-outline" size={23} color={colors.primary} />
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={() => {}}
            disabled
            accessibilityRole="button"
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              backgroundColor: colors.surfaceAlt,
              borderRadius: 16,
              padding: 13,
              opacity: 0.8,
            }}
          >
            <Ionicons name="headset-outline" size={36} color={colors.muted} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[styles.text, { fontWeight: "800" }]}>
                Récitation audio — à connecter
              </Text>
              <Text style={[styles.muted, { fontSize: 11, lineHeight: 16 }]}>
                La lecture et le surlignage mot par mot seront activés avec une source audio horodatée. Aucun état de lecture fictif n’est affiché.
              </Text>
            </View>
          </Pressable>

          {loading ? (
            <ActivityIndicator color={colors.primary} size="large" />
          ) : error ? (
            <View style={{ gap: 10 }}>
              <Text style={{ color: "#E57373", lineHeight: 21 }}>{error}</Text>
              <Pressable onPress={() => void loadSurah(Number(input))} style={styles.action}>
                <Text style={{ color: colors.primaryText, fontWeight: "800" }}>Réessayer</Text>
              </Pressable>
            </View>
          ) : (
            verses.map((verse, index) => {
              const id = Number(surah?.number ?? surah?.id ?? Number(input)) * 1000 + index + 1;
              const arabic = firstText(verse, ["text", "arabic", "text_uthmani", "arabicText", "textArabic"]);
              const translations = objectValue(verse.translations);
              const translated =
                firstText(verse, ["translation", "translationText", "text_translation", "english", "meaning"]) ||
                firstText(translations, ["french", "sahih_international"]);
              const isCurrent = selectedVerse === index;

              return (
                <Pressable
                  key={id}
                  onPress={() => {
                    setSelectedVerse(index);
                    void AsyncStorage.setItem(
                      LAST_READ_KEY,
                      JSON.stringify({
                        surah: Number(input),
                        verse: index + 1,
                        updatedAt: new Date().toISOString(),
                      })
                    );
                  }}
                  style={{
                    paddingVertical: 15,
                    paddingHorizontal: 12,
                    gap: 13,
                    borderRadius: 16,
                    backgroundColor: isCurrent ? colors.surfaceAlt : "transparent",
                    borderWidth: isCurrent ? 1 : 0,
                    borderColor: colors.primary,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={[styles.muted, { fontSize: 11, fontWeight: "800" }]}>
                      VERSET {index + 1}
                    </Text>
                    <Pressable
                      onPress={() => void toggleFavorite(index)}
                      accessibilityLabel="Ajouter aux favoris"
                    >
                      <Ionicons
                        name={favorites.includes(id) ? "bookmark" : "bookmark-outline"}
                        size={21}
                        color={favorites.includes(id) ? colors.primary : colors.muted}
                      />
                    </Pressable>
                  </View>

                  
                  {arabic ? (
                    <Text
                      style={{
                        color: colors.text,
                        fontSize,
                        lineHeight: fontSize * 1.9,
                        textAlign: "right",
                        writingDirection: "rtl",
                      }}
                    >
                      {arabic}
                    </Text>
                  ) : null}


                  {translation && translated ? (
                    <Text style={[styles.muted, { fontSize: 14, lineHeight: 23 }]}>
                      {translated}
                    </Text>
                  ) : null}

                  {!arabic && !translated ? (
                    <Text style={[styles.muted, { lineHeight: 20 }]}>
                      Les champs de ce verset ne sont pas reconnus par le lecteur.
                    </Text>
                  ) : null}
                </Pressable>
              );
            })
          )}

          {!loading && !error && verses.length > 0 ? (
            <Text style={[styles.muted, { fontSize: 11, lineHeight: 17 }]}>
              Les favoris et la dernière position sont enregistrés sur cet appareil. La mise en évidence mot par mot exige des données audio alignées avec chaque mot ; aucune synchronisation n’est simulée sans ces données.
            </Text>
          ) : null}
        </View> : null}
      </ScrollView>
    </SafeAreaView>
  );
}