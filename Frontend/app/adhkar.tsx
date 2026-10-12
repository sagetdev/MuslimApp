import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiFetch } from "../src/lib/api";
import { useAppTheme } from "../src/theme/ThemeProvider";

const KEY = "muslimapp:adhkar:counts:v1";

type Item = {
  id: string;
  title: string;
  arabic: string;
  translation: string;
  source: string;
  target: number;
};

const starter: Item[] = [
  {
    id: "morning-1",
    title: "Dhikr du matin",
    arabic: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ",
    translation: "Nous voici au matin et la royauté appartient à Allah.",
    source: "À vérifier selon l’édition et la source retenues.",
    target: 1,
  },
  {
    id: "evening-1",
    title: "Dhikr du soir",
    arabic: "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ",
    translation: "Nous voici au soir et la royauté appartient à Allah.",
    source: "À vérifier selon l’édition et la source retenues.",
    target: 1,
  },
  {
    id: "tasbih-1",
    title: "Tasbih",
    arabic: "سُبْحَانَ اللَّهِ",
    translation: "Gloire et pureté à Allah.",
    source: "Formule de dhikr ; choisis ton objectif personnel.",
    target: 33,
  },
  {
    id: "tahmid-1",
    title: "Tahmid",
    arabic: "الْحَمْدُ لِلَّهِ",
    translation: "Louange à Allah.",
    source: "Formule de dhikr ; choisis ton objectif personnel.",
    target: 33,
  },
  {
    id: "takbir-1",
    title: "Takbir",
    arabic: "اللَّهُ أَكْبَرُ",
    translation: "Allah est le plus grand.",
    source: "Formule de dhikr ; choisis ton objectif personnel.",
    target: 33,
  },
];

function flatten(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.filter((x) => x && typeof x === "object") as Record<string, unknown>[];
  }
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    if (Array.isArray(o.data)) return flatten(o.data);
    if (o.data && typeof o.data === "object") return flatten(o.data);
  }
  return [];
}

export default function AdhkarScreen() {
  const { colors } = useAppTheme();
  const [items, setItems] = useState<Item[]>(starter);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Collection locale disponible, même sans connexion.");

  useEffect(() => {
    void AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) {
        try {
          setCounts(JSON.parse(raw) as Record<string, number>);
        } catch {}
      }
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<unknown>("/duas");
      const raw = flatten(data);
      if (raw.length) {
        const mapped = raw
          .map((x, i) => ({
            id: String(x.id ?? x._id ?? i),
            title: String(x.title ?? x.name ?? x.category ?? "Invocation"),
            arabic: String(x.arabic ?? x.textArabic ?? x.arabicText ?? ""),
            translation: String(x.translation ?? x.meaning ?? x.text ?? ""),
            source: String(x.source ?? x.reference ?? "Source non fournie par l’API"),
            target: Math.max(1, Number(x.count ?? x.repeat ?? 1) || 1),
          }))
          .filter((x) => x.arabic || x.translation);
        if (mapped.length) {
          setItems(mapped);
          setMessage("Invocations chargées depuis le service.");
        }
      }
    } catch {
      setMessage("Mode hors ligne : les formules de dhikr de base restent disponibles.");
    } finally {
      setLoading(false);
    }
  }, []);

  const increment = async (id: string) => {
    const next = { ...counts, [id]: (counts[id] ?? 0) + 1 };
    setCounts(next);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  };

  const reset = async () => {
    setCounts({});
    await AsyncStorage.setItem(KEY, "{}");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 36,
          gap: 18,
          maxWidth: 900,
          width: "100%",
          alignSelf: "center",
        }}
      >
        <View style={{ gap: 7 }}>
          <Text style={{ color: colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1.8 }}>
            RAPPEL & MÉDITATION
          </Text>
          <Text style={{ color: colors.text, fontSize: 30, fontWeight: "800" }}>
            Adhkar & invocations
          </Text>
          <Text style={{ color: colors.muted, lineHeight: 21 }}>
            Prends ton temps. Les compteurs restent enregistrés sur cet appareil.
          </Text>
        </View>

        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 18,
            padding: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Ionicons name="cloud-done-outline" size={22} color={colors.primary} />
          <Text style={{ color: colors.muted, flex: 1, lineHeight: 19, fontSize: 12 }}>
            {message}
          </Text>
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Pressable onPress={() => void load()} accessibilityLabel="Actualiser les invocations">
              <Ionicons name="refresh" size={20} color={colors.primary} />
            </Pressable>
          )}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "800" }}>
            Ta collection
          </Text>
          <Pressable onPress={() => void reset()}>
            <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 12 }}>
              Réinitialiser
            </Text>
          </Pressable>
        </View>

        {items.map((item) => (
          <View
            key={item.id}
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 22,
              padding: 17,
              gap: 12,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ color: colors.primary, fontSize: 11, fontWeight: "900", letterSpacing: 0.6 }}>
                {item.title.toUpperCase()}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 11 }}>
                {counts[item.id] ?? 0} / {item.target}
              </Text>
            </View>

            {item.arabic ? (
              <Text
                style={{
                    color: "...",
                    fontSize: 28,
                    lineHeight: 48,
                    textAlign: "right",
                    writingDirection: "rtl",
                }}
                >
                {item.arabic}
              </Text>
            ) : null}

            <Text style={{ color: colors.text, fontSize: 14, lineHeight: 22 }}>
              {item.translation}
            </Text>

            <Text style={{ color: colors.muted, fontSize: 10, lineHeight: 15 }}>
              Référence : {item.source}
            </Text>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Pressable
                onPress={() => void increment(item.id)}
                style={{
                  flex: 1,
                  backgroundColor: colors.primary,
                  borderRadius: 14,
                  padding: 13,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: colors.primaryText, fontWeight: "800" }}>
                  Réciter · +1
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  const next = { ...counts, [item.id]: 0 };
                  setCounts(next);
                  void AsyncStorage.setItem(KEY, JSON.stringify(next));
                }}
                accessibilityLabel="Réinitialiser ce compteur"
                style={{ padding: 12 }}
              >
                <Ionicons name="refresh-outline" size={21} color={colors.muted} />
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}