import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
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
      const ayahs = extractVerses(parsed);
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

        <View style={[styles.card, { flexDirection: "row", alignItems: "center" }]}>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={[styles.text, { fontSize: 18, fontWeight: "800" }]}>
              {surah
                ? firstText(surah as Record<string, unknown>, ["englishName", "english_name", "name"]) ||
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

        <View style={[styles.card, { gap: 14 }]}>
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
              const translated = firstText(verse, ["translation", "translationText", "text_translation", "english", "meaning"]);
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}