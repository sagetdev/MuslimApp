import { Ionicons } from "@expo/vector-icons";
import { AmiriQuran_400Regular, useFonts } from "@expo-google-fonts/amiri-quran";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiFetch } from "../src/lib/api";
import createQuranStyles from "../src/styles/quran.styles";
import { useAppTheme } from "../src/theme/ThemeProvider";

type Ayah = { surah: number | null; number: number; text: string };
type Block = { key: string; title: string | null; ayahs: Ayah[] };
type Context = { surah: number | null; name: string | null };

const TEXT_KEYS = ["text_uthmani", "uthmani", "arabic", "arabic_text", "text_ar", "text", "ayah_text"];
const NUMBER_KEYS = ["ayah", "ayah_number", "number_in_surah", "numberInSurah", "verse_number", "verse", "number"];
const SURAH_KEYS = ["surah", "surah_number", "surahNumber", "chapter", "chapter_id"];
const NAME_KEYS = ["name_arabic", "arabic_name", "name_ar", "surah_name_arabic", "name"];
const ARABIC = /[\u0600-\u06FF]/;
const TOTAL_PAGES = 604;

const toArabicDigits = (n: number) => String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);

function unwrapResponse(value: unknown): unknown {
  if (value && typeof value === "object" && !Array.isArray(value) && "data" in value) {
    return (value as { data: unknown }).data;
  }
  return value;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && ARABIC.test(v)) return v;
  }
  return null;
}

function pickNumber(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && /^\d+$/.test(v)) return Number(v);
  }
  return null;
}

function readSurah(obj: Record<string, unknown>): Context {
  for (const key of SURAH_KEYS) {
    const v = obj[key];
    if (typeof v === "number") return { surah: v, name: null };
    if (typeof v === "string" && /^\d+$/.test(v)) return { surah: Number(v), name: null };
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const inner = v as Record<string, unknown>;
      return { surah: pickNumber(inner, ["number", "id"]), name: pickString(inner, NAME_KEYS) };
    }
  }
  return { surah: null, name: null };
}

function collectAyahs(value: unknown, context: Context, out: Ayah[]): void {
  if (Array.isArray(value)) {
    for (const item of value) collectAyahs(item, context, out);
    return;
  }
  if (!value || typeof value !== "object") return;

  const obj = value as Record<string, unknown>;
  const own = readSurah(obj);
  const next: Context = { surah: own.surah ?? context.surah, name: own.name ?? context.name };
  const text = pickString(obj, TEXT_KEYS);

  if (text) {
    out.push({ surah: next.surah, number: pickNumber(obj, NUMBER_KEYS) ?? out.length + 1, text });
    return;
  }
  for (const child of Object.values(obj)) collectAyahs(child, next, out);
}

type Props = {
  page: number;
  onPageChange: (page: number) => void;
  onClose?: () => void;
};

export default function QuranPage({ page, onPageChange, onClose }: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createQuranStyles(colors), [colors]);
  const [fontsLoaded] = useFonts({ AmiriQuran_400Regular });
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    scrollRef.current?.scrollTo({ y: 0, animated: false });

    apiFetch<unknown>(`/quran/pages/${page}`)
      .then((response) => {
        if (!active) return;
        const out: Ayah[] = [];
        collectAyahs(unwrapResponse(response), { surah: null, name: null }, out);
        setAyahs(out);
        if (out.length === 0) setError("Aucun verset arabe trouvé dans la réponse de l'API.");
      })
      .catch((caught) => {
        if (!active) return;
        setAyahs([]);
        setError(caught instanceof Error ? caught.message : "Une erreur inconnue est survenue.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, reloadKey]);

  const blocks = useMemo<Block[]>(() => {
    const result: Block[] = [];
    for (const ayah of ayahs) {
      const last = result[result.length - 1];
      if (ayah.number === 1 || !last) {
        result.push({
          key: `${ayah.surah ?? "s"}-${ayah.number}-${result.length}`,
          title: ayah.number === 1 && ayah.surah ? `سُورَةُ ${toArabicDigits(ayah.surah)}` : null,
          ayahs: [ayah],
        });
      } else {
        last.ayahs.push(ayah);
      }
    }
    return result;
  }, [ayahs]);

  const hasPrev = page > 1;
  const hasNext = page < TOTAL_PAGES;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.iconButton} accessibilityLabel="Fermer">
          <Ionicons name="close-outline" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Le Saint Coran</Text>
        <View style={styles.iconButton}>
          <Ionicons name="book-outline" size={20} color={colors.primary} />
        </View>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading || !fontsLoaded ? (
          <View style={styles.feedback}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.feedback}>
            <Ionicons name="alert-circle-outline" size={28} color="#E57373" />
            <Text style={styles.feedbackText}>{error}</Text>
            <Pressable onPress={() => setReloadKey((key) => key + 1)} style={styles.retryButton}>
              <Text style={styles.retryText}>Réessayer</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.paper}>
            {blocks.map((block) => (
              <View key={block.key} style={{ gap: 14 }}>
                {block.title ? (
                  <View style={styles.banner}>
                    <Text style={styles.bannerText}>{block.title}</Text>
                  </View>
                ) : null}
                <Text style={styles.quranText}>
                  {block.ayahs.map((ayah) => (
                    <Text key={`${ayah.surah}-${ayah.number}`}>
                      {ayah.text}
                      <Text style={styles.marker}> ﴿{toArabicDigits(ayah.number)}﴾ </Text>
                    </Text>
                  ))}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <Pressable
            disabled={!hasPrev}
            onPress={() => onPageChange(page - 1)}
            style={[styles.navButton, !hasPrev && styles.navButtonDisabled]}
          >
            <Ionicons name="chevron-back" size={16} color={colors.primaryText} />
            <Text style={styles.navText}>Précédente</Text>
          </Pressable>
          <Text style={styles.pageLabel}>Page {page} / {TOTAL_PAGES}</Text>
          <Pressable
            disabled={!hasNext}
            onPress={() => onPageChange(page + 1)}
            style={[styles.navButton, !hasNext && styles.navButtonDisabled]}
          >
            <Text style={styles.navText}>Suivante</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primaryText} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}