import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import QuranPage from "../components/QuranPage";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apiFetch } from "../src/lib/api";
import { getBundledSurah, getCachedSurah, setCachedSurah } from "../src/lib/quranTextOffline";
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


type SurahInfo = { number: number; name: string; arabic: string; verses: number };

const SURAHS: SurahInfo[] = [
  ["Al-Fatiha","الفاتحة",7],["Al-Baqara","البقرة",286],["Ali 'Imran","آل عمران",200],
  ["An-Nisa","النساء",176],["Al-Ma'idah","المائدة",120],["Al-An'am","الأنعام",165],
  ["Al-A'raf","الأعراف",206],["Al-Anfal","الأنفال",75],["At-Tawbah","التوبة",129],
  ["Yunus","يونس",109],["Hud","هود",123],["Yusuf","يوسف",111],["Ar-Ra'd","الرعد",43],
  ["Ibrahim","إبراهيم",52],["Al-Hijr","الحجر",99],["An-Nahl","النحل",128],
  ["Al-Isra","الإسراء",111],["Al-Kahf","الكهف",110],["Maryam","مريم",98],
  ["Ta-Ha","طه",135],["Al-Anbiya","الأنبياء",112],["Al-Hajj","الحج",78],
  ["Al-Mu'minun","المؤمنون",118],["An-Nur","النور",64],["Al-Furqan","الفرقان",77],
  ["Ash-Shu'ara","الشعراء",227],["An-Naml","النمل",93],["Al-Qasas","القصص",88],
  ["Al-Ankabut","العنكبوت",69],["Ar-Rum","الروم",60],["Luqman","لقمان",34],
  ["As-Sajdah","السجدة",30],["Al-Ahzab","الأحزاب",73],["Saba","سبأ",54],
  ["Fatir","فاطر",45],["Ya-Sin","يس",83],["As-Saffat","الصافات",182],
  ["Sad","ص",88],["Az-Zumar","الزمر",75],["Ghafir","غافر",85],
  ["Fussilat","فصلت",54],["Ash-Shura","الشورى",53],["Az-Zukhruf","الزخرف",89],
  ["Ad-Dukhan","الدخان",59],["Al-Jathiyah","الجاثية",37],["Al-Ahqaf","الأحقاف",35],
  ["Muhammad","محمد",38],["Al-Fath","الفتح",29],["Al-Hujurat","الحجرات",18],
  ["Qaf","ق",45],["Adh-Dhariyat","الذاريات",60],["At-Tur","الطور",49],
  ["An-Najm","النجم",62],["Al-Qamar","القمر",55],["Ar-Rahman","الرحمن",78],
  ["Al-Waqi'ah","الواقعة",96],["Al-Hadid","الحديد",29],["Al-Mujadila","المجادلة",22],
  ["Al-Hashr","الحشر",24],["Al-Mumtahanah","الممتحنة",13],["As-Saff","الصف",14],
  ["Al-Jumu'ah","الجمعة",11],["Al-Munafiqun","المنافقون",11],["At-Taghabun","التغابن",18],
  ["At-Talaq","الطلاق",12],["At-Tahrim","التحريم",12],["Al-Mulk","الملك",30],
  ["Al-Qalam","القلم",52],["Al-Haqqah","الحاقة",52],["Al-Ma'arij","المعارج",44],
  ["Nuh","نوح",28],["Al-Jinn","الجن",28],["Al-Muzzammil","المزمل",20],
  ["Al-Muddaththir","المدثر",56],["Al-Qiyamah","القيامة",40],["Al-Insan","الإنسان",31],
  ["Al-Mursalat","المرسلات",50],["An-Naba","النبأ",40],["An-Nazi'at","النازعات",46],
  ["Abasa","عبس",42],["At-Takwir","التكوير",29],["Al-Infitar","الانفطار",19],
  ["Al-Mutaffifin","المطففين",36],["Al-Inshiqaq","الانشقاق",25],["Al-Buruj","البروج",22],
  ["At-Tariq","الطارق",17],["Al-A'la","الأعلى",19],["Al-Ghashiyah","الغاشية",26],
  ["Al-Fajr","الفجر",30],["Al-Balad","البلد",20],["Ash-Shams","الشمس",15],
  ["Al-Layl","الليل",21],["Ad-Duha","الضحى",11],["Ash-Sharh","الشرح",8],
  ["At-Tin","التين",8],["Al-Alaq","العلق",19],["Al-Qadr","القدر",5],
  ["Al-Bayyinah","البينة",8],["Az-Zalzalah","الزلزلة",8],["Al-Adiyat","العاديات",11],
  ["Al-Qari'ah","القارعة",11],["At-Takathur","التكاثر",8],["Al-Asr","العصر",3],
  ["Al-Humazah","الهمزة",9],["Al-Fil","الفيل",5],["Quraysh","قريش",4],
  ["Al-Ma'un","الماعون",7],["Al-Kawthar","الكوثر",3],["Al-Kafirun","الكافرون",6],
  ["An-Nasr","النصر",3],["Al-Masad","المسد",5],["Al-Ikhlas","الإخلاص",4],
  ["Al-Falaq","الفلق",5],["An-Nas","الناس",6],
].map(([name, arabic, verses], index) => ({
  number: index + 1,
  name: name as string,
  arabic: arabic as string,
  verses: verses as number,
}));

// Début de chaque Juz selon la division courante du Mushaf.
const JUZ_STARTS: Array<{ juz: number; surah: number; verse: number }> = [
  { juz: 1, surah: 1, verse: 1 }, { juz: 2, surah: 2, verse: 142 },
  { juz: 3, surah: 2, verse: 253 }, { juz: 4, surah: 3, verse: 93 },
  { juz: 5, surah: 4, verse: 24 }, { juz: 6, surah: 4, verse: 148 },
  { juz: 7, surah: 5, verse: 82 }, { juz: 8, surah: 6, verse: 111 },
  { juz: 9, surah: 7, verse: 88 }, { juz: 10, surah: 8, verse: 41 },
  { juz: 11, surah: 9, verse: 93 }, { juz: 12, surah: 11, verse: 6 },
  { juz: 13, surah: 12, verse: 53 }, { juz: 14, surah: 15, verse: 1 },
  { juz: 15, surah: 17, verse: 1 }, { juz: 16, surah: 18, verse: 75 },
  { juz: 17, surah: 21, verse: 1 }, { juz: 18, surah: 23, verse: 1 },
  { juz: 19, surah: 25, verse: 21 }, { juz: 20, surah: 27, verse: 56 },
  { juz: 21, surah: 29, verse: 46 }, { juz: 22, surah: 33, verse: 31 },
  { juz: 23, surah: 36, verse: 28 }, { juz: 24, surah: 39, verse: 32 },
  { juz: 25, surah: 41, verse: 47 }, { juz: 26, surah: 46, verse: 1 },
  { juz: 27, surah: 51, verse: 31 }, { juz: 28, surah: 58, verse: 1 },
  { juz: 29, surah: 67, verse: 1 }, { juz: 30, surah: 78, verse: 1 },
];

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
  const [input, setInput] = useState(initial ?? "1");\n  const [surahSearch, setSurahSearch] = useState("");\n  const [showSurahList, setShowSurahList] = useState(false);\n  const [showJuzList, setShowJuzList] = useState(false);
  const [surah, setSurah] = useState<Surah | null>(null);
  const [verses, setVerses] = useState<Record<string, unknown>[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [translation, setTranslation] = useState(true);
  const [fontSize, setFontSize] = useState(28);
  const [selectedVerse, setSelectedVerse] = useState(0);
  const [readingMode, setReadingMode] = useState<"verses" | "pages">("verses");

  useEffect(() => {
    void AsyncStorage.getItem(FAVORITES_KEY).then((raw) => {
      if (raw) {
        try {
          setFavorites(JSON.parse(raw) as number[]);
        } catch {}
      }
    });
  }, []);

  const loadSurah = useCallback(async (number: number, verseNumber = 1) => {
    if (!Number.isInteger(number) || number < 1 || number > 114) {
      setError("Entre un numéro de sourate entre 1 et 114.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      // Priorité 1 : bundle embarqué au build. Priorité 2 : cache persistant.
      // Le réseau n'est utilisé qu'en dernier recours.
      let result =
        (await getBundledSurah(number)) ??
        (await getCachedSurah(number));

      if (!result) {
        result = await apiFetch<unknown>(`/quran/surahs/${number}`);
        await setCachedSurah(number, result);
      }

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
      // Garde une trace exploitable même si l'erreur est interceptée par l'écran.
      console.error("[QuranReader] Échec du chargement de la sourate :", e);
      const diagnostic =
        e instanceof Error
          ? (e.stack || e.message)
          : typeof e === "string"
          ? e
          : JSON.stringify(e);
      setError(diagnostic || "Impossible de charger la sourate.");
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

  // Appel via une fonction pour éviter que TypeScript ne réduise readingMode à "verses"
  // dans le JSX qui suit et signale à tort les comparaisons utilisées pour les boutons.
  const isPagesMode = () => readingMode === "pages";

  if (isPagesMode()) {
    return (
      <QuranPage
        initialPage={1}
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

        <View style={[styles.card, { gap: 14 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sourate précédente"
              disabled={loading || Number(input) <= 1}
              onPress={() => void loadSurah(Number(input) - 1)}
              style={{ padding: 10, borderRadius: 12, backgroundColor: colors.surfaceAlt, opacity: Number(input) <= 1 ? 0.35 : 1 }}
            >
              <Ionicons name="chevron-back" size={23} color={colors.text} />
            </Pressable>
            <View style={{ flex: 1, gap: 4, alignItems: "center" }}>
              <Text style={[styles.text, { fontSize: 18, fontWeight: "800", textAlign: "center" }]}>
                {surah ? SURAHS[Number(input) - 1]?.name ?? `Sourate ${input}` : "Choisir une sourate"}
              </Text>
              <Text style={[styles.text, { fontSize: 22, textAlign: "center" }]}>
                {SURAHS[Number(input) - 1]?.arabic ?? ""}
              </Text>
              <Text style={[styles.muted, { fontSize: 12, textAlign: "center" }]}>
                Sourate {input} sur 114 · {SURAHS[Number(input) - 1]?.verses ?? "—"} versets
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sourate suivante"
              disabled={loading || Number(input) >= 114}
              onPress={() => void loadSurah(Number(input) + 1)}
              style={{ padding: 10, borderRadius: 12, backgroundColor: colors.surfaceAlt, opacity: Number(input) >= 114 ? 0.35 : 1 }}
            >
              <Ionicons name="chevron-forward" size={23} color={colors.text} />
            </Pressable>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <TextInput
              accessibilityLabel="Rechercher une sourate par nom"
              accessibilityHint="Saisissez un nom comme Yasin ou Al-Baqara"
              value={surahSearch}
              onChangeText={(value) => {
                setSurahSearch(value);
                setShowSurahList(true);
                setShowJuzList(false);
              }}
              placeholder="Rechercher par nom…"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              style={{ flex: 1, color: colors.text, backgroundColor: colors.surfaceAlt, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 11 }}
            />
            <TextInput
              accessibilityLabel="Numéro de sourate"
              value={input}
              onChangeText={setInput}
              keyboardType="number-pad"
              maxLength={3}
              style={{ color: colors.text, backgroundColor: colors.surfaceAlt, borderRadius: 12, width: 58, textAlign: "center", padding: 10, fontWeight: "800" }}
            />
            <Pressable onPress={() => void loadSurah(Number(input))} style={styles.action}>
              <Text style={{ color: colors.primaryText, fontWeight: "800" }}>Ouvrir</Text>
            </Pressable>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: showSurahList }}
              onPress={() => { setShowSurahList((v) => !v); setShowJuzList(false); }}
              style={[styles.action, { flex: 1, backgroundColor: showSurahList ? colors.primary : colors.surfaceAlt }]}
            >
              <Text style={{ color: showSurahList ? colors.primaryText : colors.text, fontWeight: "800" }}>Liste des sourates</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: showJuzList }}
              onPress={() => { setShowJuzList((v) => !v); setShowSurahList(false); }}
              style={[styles.action, { flex: 1, backgroundColor: showJuzList ? colors.primary : colors.surfaceAlt }]}
            >
              <Text style={{ color: showJuzList ? colors.primaryText : colors.text, fontWeight: "800" }}>Explorer les Juz</Text>
            </Pressable>
          </View>

          {showSurahList ? (
            <View style={{ gap: 8 }}>
              <Text style={[styles.muted, { fontSize: 12 }]}>Sélectionnez une sourate dans la liste des 114 sourates.</Text>
              <ScrollView nestedScrollEnabled style={{ maxHeight: 300 }} keyboardShouldPersistTaps="handled">
                {SURAHS.filter((item) => {
                  const query = surahSearch.trim().toLocaleLowerCase();
                  return !query || item.name.toLocaleLowerCase().includes(query) || item.arabic.includes(surahSearch.trim()) || String(item.number) === query;
                }).map((item) => (
                  <Pressable
                    key={item.number}
                    accessibilityRole="button"
                    accessibilityLabel={`Sourate ${item.number}, ${item.name}, ${item.verses} versets`}
                    onPress={() => { setSurahSearch(""); void loadSurah(item.number); }}
                    style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 10, backgroundColor: Number(input) === item.number ? colors.surfaceAlt : "transparent" }}
                  >
                    <View style={{ width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: colors.surfaceAlt }}>
                      <Text style={[styles.text, { fontWeight: "800" }]}>{item.number}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[styles.text, { fontWeight: "700" }]}>{item.name}</Text>
                      <Text style={[styles.muted, { fontSize: 11 }]}>{item.verses} versets</Text>
                    </View>
                    <Text style={[styles.text, { fontSize: 20 }]}>{item.arabic}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {showJuzList ? (
            <View style={{ gap: 8 }}>
              <Text style={[styles.muted, { fontSize: 12, lineHeight: 18 }]}>
                Choisissez l’un des 30 Juz. La lecture s’ouvrira à son verset de départ.
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {JUZ_STARTS.map((item) => (
                  <Pressable
                    key={item.juz}
                    accessibilityRole="button"
                    accessibilityLabel={`Ouvrir le Juz ${item.juz}`}
                    onPress={() => void loadSurah(item.surah, item.verse)}
                    style={{ minWidth: 62, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.surfaceAlt, alignItems: "center" }}
                  >
                    <Text style={[styles.text, { fontWeight: "800" }]}>Juz {item.juz}</Text>
                    <Text style={[styles.muted, { fontSize: 10 }]}>{item.surah}:{item.verse}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </View>


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