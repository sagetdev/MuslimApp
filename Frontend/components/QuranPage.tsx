import { Ionicons } from "@expo/vector-icons";
import { loadHafsFont, loadPageFont, pageFont, setFontPriority } from "../src/lib/quranFonts";
import { getOfflinePage } from "../src/lib/quranOffline";
import Slider from "@react-native-community/slider";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  useWindowDimensions,
  View,
  ViewToken,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getSurahForPage, TOTAL_PAGES } from "../src/data/pageToSurah";
import { apiFetch } from "../src/lib/api";
import createQuranStyles from "../src/styles/quran.styles";
import { useAppTheme } from "../src/theme/ThemeProvider";

type Word = { code: string | null; text: string | null; kind: "word" | "end"; page: number };
type Line = { number: number; words: Word[] };
type Header = { type: "banner"; name: string; surahNumber?: number } | { type: "bismillah" };
type MushafPageData = { page: number; lines: Line[]; headers: Record<string, Header> };

const FONT_RATIO = 0.058;
const BISMILLAH = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";

const ALL_PAGES = Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1);

type Props = {
  initialPage?: number;
  onClose?: () => void;
  offline?: boolean;
};

function MushafPageItem({
  page,
  containerWidth,
  offline,
}: {
  page: number;
  containerWidth: number;
  offline: boolean;
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createQuranStyles(colors), [colors]);

  const [data, setData] = useState<MushafPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const frameWidth = Math.min(containerWidth - 24, 560);
  const lineWidth = frameWidth - 38;
  const fontSize = lineWidth * FONT_RATIO;
  const lineHeight = fontSize * 1.8;
  const totalLines = 15;

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError(null);

        (async () => {
        try {
            const [response] = await Promise.all([
            offline
              ? getOfflinePage<{ data: MushafPageData }>(page)
              : apiFetch<{ data: MushafPageData }>(`/mushaf/pages/${page}`, {
                  priority: "high",
                }),
            loadHafsFont(),
            loadPageFont(page),
            ]);

            const result = response?.data;
            if (!result?.lines) {
            throw new Error("Réponse invalide du serveur (pas de lignes).");
            }
            const pages = new Set(
            result.lines.flatMap((line) => line.words.map((word) => word.page))
            );
            await Promise.all([...pages].map(loadPageFont));

            if (!active) return;
            setData(result);
        } catch (caught) {
            if (!active) return;
            setData(null);
            setError(caught instanceof Error ? caught.message : "Erreur de chargement.");
        } finally {
            if (active) setLoading(false);
        }
        })();

        return () => {
        active = false;
        };
    }, [page, reloadKey, offline]);

  // Nom de la sourate (issu du banner si présent, sinon null)
  const pageSurahName = useMemo(() => {
    if (!data) return null;
    const banner = Object.values(data.headers).find(
      (h): h is Extract<Header, { type: "banner" }> => h.type === "banner"
    );
    return banner?.name ?? null;
  }, [data]);

  const rows = useMemo(() => {
    if (!data) return [];
    const byNumber = new Map(data.lines.map((line) => [line.number, line] as const));

    const allRows = Array.from({ length: totalLines }, (_, index) => {
      const number = index + 1;
      return {
        number,
        line: byNumber.get(number),
        header: data.headers[String(number)] || data.headers[number],
      };
    });

    if (page <= 2) {
      return allRows.filter((row) => row.line || row.header);
    }

    return allRows;
  }, [data, totalLines, page]);

  const isSpecialPage = page <= 2;
  const hizbNumber = Math.ceil(page / 10);
  const { number: surahNumber, name: surahName } = getSurahForPage(page);

  return (
    <View style={{ width: containerWidth, alignItems: "center" }}>
      {/* En-tête supérieur propre à la page */}
      <View style={styles.mushafHeaderContainer}>
        {/* Gauche : Hizb */}
        <Text style={styles.mushafHeaderSubtext}>{`الحزب ${hizbNumber}`}</Text>

        {/* Droite : Sourate et son Numéro */}
        <Text style={styles.mushafHeaderSubtext}>
            {`سُورَةُ ${surahName} (${surahNumber})`}
        </Text>
      </View>

      {/* Corps de la page */}
      {loading ? (
        <View style={styles.feedback}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error || !data ? (
        <View style={styles.feedback}>
          <Ionicons name="alert-circle-outline" size={28} color="#E57373" />
          <Text style={styles.feedbackText}>{error ?? "Aucune donnée."}</Text>
          <Pressable onPress={() => setReloadKey((k) => k + 1)} style={styles.retryButton}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.frame, { width: frameWidth }]}>
          <View
            style={[
              styles.paper,
              isSpecialPage && { justifyContent: "center", paddingVertical: 24 },
            ]}
          >
            {rows.map(({ number, line, header }) => {
              if (line) {
                return (
                  <View
                    key={number}
                    style={[
                      styles.line,
                      {
                        height: lineHeight,
                        justifyContent: isSpecialPage ? "center" : "space-between",
                        flexDirection: "row-reverse",
                        gap: isSpecialPage ? fontSize * 0.4 : 0,
                      },
                    ]}
                  >
                    {line.words.map((word, index) => {
                      const isEndSymbol = word.kind === "end";
                      return (
                        <Text
                          key={`${number}-${index}`}
                          style={{
                            color: colors.text,
                            fontSize: isEndSymbol ? fontSize * 0.9 : fontSize,
                            lineHeight,
                            fontFamily: isEndSymbol ? "UthmanicHafs" : pageFont(word.page),
                            textAlign: "center",
                          }}
                        >
                          {isEndSymbol ? word.text : word.code}
                        </Text>
                      );
                    })}
                  </View>
                );
              }

              if (header?.type === "banner") {
                return (
                  <View
                    key={number}
                    style={[
                      styles.headerSlot,
                      { height: lineHeight, justifyContent: "center", alignItems: "center" },
                    ]}
                  >
                    <View style={styles.banner}>
                      <Text
                        style={{
                          color: colors.primary,
                          fontFamily: "UthmanicHafs",
                          fontSize: fontSize * 0.95,
                          textAlign: "center",
                        }}
                      >
                        {`سُورَةُ ${header.name}`}
                      </Text>
                    </View>
                  </View>
                );
              }

              if (header?.type === "bismillah") {
                return (
                  <View
                    key={number}
                    style={[
                      styles.headerSlot,
                      { height: lineHeight, justifyContent: "center", alignItems: "center" },
                    ]}
                  >
                    <Text
                      style={{
                        color: colors.text,
                        fontFamily: "UthmanicHafs",
                        fontSize: fontSize * 0.95,
                        textAlign: "center",
                      }}
                    >
                      {BISMILLAH}
                    </Text>
                  </View>
                );
              }

              return <View key={number} style={{ height: lineHeight }} />;
            })}

            <Text style={styles.pageNumber}>{page}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

export default function QuranPage({ initialPage = 1, onClose, offline = false }: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createQuranStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const [currentPage, setCurrentPage] = useState(initialPage);

  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].item) {
        setCurrentPage(viewableItems[0].item as number);
      }
    },
    []
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  // Navigation via le slider
  const handleSliderChange = useCallback((value: number) => {
    setCurrentPage(Math.round(value));
  }, []);

  const handleSliderComplete = useCallback((value: number) => {
    const page = Math.round(value);
    const index = page - 1;
    if (flatListRef.current && index >= 0 && index < TOTAL_PAGES) {
      flatListRef.current.scrollToIndex({ index, animated: false });
    }
  }, []);

  // Numéro de la sourate actuelle, calculé à partir de la page courante
  // Sourate actuelle (numéro + nom) calculée à partir de la page courante
    const currentSurah = useMemo(
    () => getSurahForPage(currentPage),
    [currentPage]
    );

    useEffect(() => {
        setFontPriority(currentPage);
    }, [currentPage]);

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* En-tête fixe supérieur */}
      <View
        style={{
          width: "100%",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 12,
          paddingVertical: 6,
        }}
      >
        {/* Bouton fermer à gauche */}
        <Pressable onPress={onClose} style={styles.iconButton} accessibilityLabel="Fermer">
          <Ionicons name="close-outline" size={20} color={colors.text} />
        </Pressable>

        {/* Numéro de la sourate actuelle à droite */}
        {/* <Text
          style={{
            color: colors.text,
            fontSize: 16,
            fontWeight: "600",
            fontFamily: "UthmanicHafs",
          }}
        >
          {`سُورَةُ ${currentSurahNumber}`}
        </Text> */}
      </View>

      {/* Défilement horizontal des pages */}
      <FlatList
        ref={flatListRef}
        data={ALL_PAGES}
        horizontal
        pagingEnabled
        initialNumToRender={1}
        updateCellsBatchingPeriod={80}
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={initialPage - 1}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        keyExtractor={(item) => String(item)}
        renderItem={({ item }) => (
          <MushafPageItem page={item} containerWidth={width} offline={offline} />
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        removeClippedSubviews
        maxToRenderPerBatch={2}
        windowSize={3}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToOffset({
              offset: info.index * width,
              animated: true,
            });
          }, 100);
        }}
      />

      {/* Slider de navigation + numéro de page */}
      <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 }}>
        <Slider
          style={{ width: "100%", height: 32 }}
          minimumValue={1}
          maximumValue={TOTAL_PAGES}
          step={1}
          value={currentPage}
          onValueChange={handleSliderChange}
          onSlidingComplete={handleSliderComplete}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.border ?? "#ccc"}
          thumbTintColor={colors.primary}
        />
        <View style={{ alignItems: "center", marginTop: 2 }}>
          <Text style={styles.pageLabel}>
            Page {currentPage} / {TOTAL_PAGES}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}