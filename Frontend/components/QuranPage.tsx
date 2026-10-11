import { Ionicons } from "@expo/vector-icons";
import * as Font from "expo-font";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiFetch } from "../src/lib/api";
import createQuranStyles from "../src/styles/quran.styles";
import { useAppTheme } from "../src/theme/ThemeProvider";

type Word = { code: string | null; text: string | null; kind: "word" | "end"; page: number };
type Line = { number: number; words: Word[] };
type Header = { type: "banner"; name: string } | { type: "bismillah" };
type MushafPageData = { page: number; lines: Line[]; headers: Record<string, Header> };

const FONT_CDN = "https://verses.quran.foundation/fonts/quran/hafs";
const TOTAL_PAGES = 604;
const FONT_RATIO = 0.058; // taille de police / largeur de ligne : à ajuster si les mots débordent
const BISMILLAH = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";

const toArabicDigits = (n: number) => String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);

const fontPromises = new Map<string, Promise<void>>();

function ensureFont(name: string, uri: string): Promise<void> {
  let promise = fontPromises.get(name);

  if (!promise) {
    promise = Font.loadAsync({ [name]: { uri } }).catch((error) => {
      fontPromises.delete(name);
      throw error;
    });
    fontPromises.set(name, promise);
  }

  return promise;
}

const pageFont = (page: number) => `QCF2_P${page}`;
const loadPageFont = (page: number) => ensureFont(pageFont(page), `${FONT_CDN}/v2/ttf/p${page}.ttf`);
const loadHafsFont = () => ensureFont("UthmanicHafs", `${FONT_CDN}/uthmanic_hafs/UthmanicHafs1Ver18.ttf`);

type Props = {
  page: number;
  onPageChange: (page: number) => void;
  onClose?: () => void;
};

export default function QuranPage({ page, onPageChange, onClose }: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createQuranStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const [data, setData] = useState<MushafPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const frameWidth = Math.min(width - 24, 560);
  const lineWidth = frameWidth - 38;
  const fontSize = lineWidth * FONT_RATIO;
  const lineHeight = fontSize * 1.8;
  const totalLines = page <= 2 ? 8 : 15;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    scrollRef.current?.scrollTo({ y: 0, animated: false });

    (async () => {
      try {
        const [response] = await Promise.all([
          apiFetch<{ data: MushafPageData }>(`/mushaf/pages/${page}`),
          loadHafsFont(),
          loadPageFont(page),
        ]);

        const result = response.data;
        const pages = new Set(result.lines.flatMap((line) => line.words.map((word) => word.page)));

        await Promise.all([...pages].map(loadPageFont));

        if (!active) return;
        setData(result);
      } catch (caught) {
        if (!active) return;
        setData(null);
        setError(caught instanceof Error ? caught.message : "Une erreur inconnue est survenue.");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [page, reloadKey]);

  const rows = useMemo(() => {
    if (!data) return [];

    const byNumber = new Map(data.lines.map((line) => [line.number, line] as const));

    return Array.from({ length: totalLines }, (_, index) => {
      const number = index + 1;
      return { number, line: byNumber.get(number), header: data.headers[number] };
    });
  }, [data, totalLines]);

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
        {loading ? (
          <View style={styles.feedback}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error || !data ? (
          <View style={styles.feedback}>
            <Ionicons name="alert-circle-outline" size={28} color="#E57373" />
            <Text style={styles.feedbackText}>{error ?? "Aucune donnée."}</Text>
            <Pressable onPress={() => setReloadKey((key) => key + 1)} style={styles.retryButton}>
              <Text style={styles.retryText}>Réessayer</Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.frame, { width: frameWidth }]}>
            <View style={styles.paper}>
              {rows.map(({ number, line, header }) => {
                if (line) {
                  return (
                    <View
                      key={number}
                      style={[
                        styles.line,
                        {
                          height: lineHeight,
                          justifyContent: page <= 2 ? "center" : "space-between",
                          gap: page <= 2 ? fontSize * 0.2 : 0,
                        },
                      ]}
                    >
                      {line.words.map((word, index) => (
                        <Text
                          key={`${number}-${index}`}
                          style={{
                            color: colors.text,
                            fontSize,
                            lineHeight,
                            fontFamily: word.kind === "end" ? "UthmanicHafs" : pageFont(word.page),
                          }}
                        >
                          {word.kind === "end" ? word.text : word.code}
                        </Text>
                      ))}
                    </View>
                  );
                }

                if (header?.type === "banner") {
                  return (
                    <View key={number} style={[styles.headerSlot, { height: lineHeight }]}>
                      <View style={styles.banner}>
                        <Text style={{ color: colors.primary, fontFamily: "UthmanicHafs", fontSize: fontSize * 0.9 }}>
                          {`سُورَةُ ${header.name}`}
                        </Text>
                      </View>
                    </View>
                  );
                }

                if (header?.type === "bismillah") {
                  return (
                    <View key={number} style={[styles.headerSlot, { height: lineHeight }]}>
                      <Text style={{ color: colors.text, fontFamily: "UthmanicHafs", fontSize: fontSize * 0.95 }}>
                        {BISMILLAH}
                      </Text>
                    </View>
                  );
                }

                return <View key={number} style={{ height: lineHeight }} />;
              })}

              <Text style={styles.pageNumber}>{toArabicDigits(page)}</Text>
            </View>
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

        <Text style={styles.credit}>Polices du Coran : Quran Foundation</Text>
      </ScrollView>
    </SafeAreaView>
  );
}