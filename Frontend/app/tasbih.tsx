import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, Text, Vibration, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BackButton from "../components/BackButton";
import { useAppTheme } from "../src/theme/ThemeProvider";

const STORAGE_KEY = "muslimapp:tasbih:v1";

const DHIKRS = [
  { id: "subhanallah", arabic: "سُبْحَانَ ٱللَّٰهِ", label: "SubhanAllah", meaning: "Gloire à Allah", target: 33 },
  { id: "alhamdulillah", arabic: "ٱلْحَمْدُ لِلَّٰهِ", label: "Alhamdulillah", meaning: "Louange à Allah", target: 33 },
  { id: "allahu-akbar", arabic: "ٱللَّٰهُ أَكْبَرُ", label: "Allahu Akbar", meaning: "Allah est le Plus Grand", target: 34 },
  { id: "la-ilaha", arabic: "لَا إِلَٰهَ إِلَّا ٱللَّٰهُ", label: "La ilaha illa Allah", meaning: "Il n’y a de divinité qu’Allah", target: 100 },
  { id: "istighfar", arabic: "أَسْتَغْفِرُ ٱللَّٰهَ", label: "Astaghfirullah", meaning: "Je demande pardon à Allah", target: 100 },
  { id: "salawat", arabic: "ٱللَّٰهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ", label: "Salawat", meaning: "Prière sur le Prophète ﷺ", target: 100 },
] as const;

type TasbihState = {
  selected: number;
  counts: Record<string, number>;
  laps: Record<string, number>;
  day: string;
  today: number;
};

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function emptyState(): TasbihState {
  return { selected: 0, counts: {}, laps: {}, day: todayKey(), today: 0 };
}

function sanitize(raw: unknown): TasbihState {
  const base = emptyState();
  if (!raw || typeof raw !== "object") return base;
  const value = raw as Partial<TasbihState>;
  const num = (n: unknown) => (typeof n === "number" && Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0);
  const cleanMap = (map: unknown) => {
    const out: Record<string, number> = {};
    if (map && typeof map === "object") {
      for (const d of DHIKRS) out[d.id] = num((map as Record<string, unknown>)[d.id]);
    }
    return out;
  };
  const sameDay = value.day === base.day;
  return {
    selected: Math.min(DHIKRS.length - 1, num(value.selected)),
    counts: cleanMap(value.counts),
    laps: cleanMap(value.laps),
    day: base.day,
    today: sameDay ? num(value.today) : 0,
  };
}

export default function TasbihScreen() {
  const { colors } = useAppTheme();
  const [state, setState] = useState<TasbihState>(emptyState);
  const [ready, setReady] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => (raw ? sanitize(JSON.parse(raw)) : emptyState()))
      .catch(() => emptyState())
      .then((loaded) => {
        if (!active) return;
        setState(loaded);
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state, ready]);

  const dhikr = DHIKRS[state.selected];
  const count = state.counts[dhikr.id] ?? 0;
  const laps = state.laps[dhikr.id] ?? 0;
  const progress = Math.min(1, count / dhikr.target);

  const increment = useCallback(() => {
    const current = stateRef.current;
    const item = DHIKRS[current.selected];
    const next = (current.counts[item.id] ?? 0) + 1;
    const completed = next >= item.target;
    if (Platform.OS !== "web") Vibration.vibrate(completed ? [0, 60, 60, 60] : 12);
    setState({
      ...current,
      day: todayKey(),
      today: (current.day === todayKey() ? current.today : 0) + 1,
      counts: { ...current.counts, [item.id]: completed ? 0 : next },
      laps: completed ? { ...current.laps, [item.id]: (current.laps[item.id] ?? 0) + 1 } : current.laps,
    });
  }, []);

  const resetCurrent = useCallback(() => {
    const doReset = () =>
      setState((current) => ({
        ...current,
        counts: { ...current.counts, [DHIKRS[current.selected].id]: 0 },
        laps: { ...current.laps, [DHIKRS[current.selected].id]: 0 },
      }));
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm("Remettre ce dhikr à zéro ?")) doReset();
      return;
    }
    Alert.alert("Remettre à zéro ?", "Le compteur et les cycles de ce dhikr seront réinitialisés.", [
      { text: "Annuler", style: "cancel" },
      { text: "Réinitialiser", style: "destructive", onPress: doReset },
    ]);
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 36, gap: 18, maxWidth: 900, width: "100%", alignSelf: "center" }}>
        <BackButton />
        <View style={{ gap: 6 }}>
          <Text style={{ color: colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1.8 }}>DHIKR</Text>
          <Text style={{ color: colors.text, fontSize: 30, fontWeight: "800" }}>Tasbih</Text>
          <Text style={{ color: colors.muted, lineHeight: 21 }}>
            Un compteur simple pour tes invocations. Ta progression est enregistrée sur ton appareil.
          </Text>
        </View>

        <View accessibilityRole="radiogroup" style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {DHIKRS.map((item, index) => {
            const selected = index === state.selected;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setState((current) => ({ ...current, selected: index }))}
                style={{
                  paddingVertical: 9,
                  paddingHorizontal: 13,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: selected ? colors.primary : colors.surfaceAlt,
                }}
              >
                <Text style={{ color: selected ? colors.primaryText : colors.text, fontSize: 12, fontWeight: "700" }}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 24, padding: 22, alignItems: "center", gap: 14 }}>
          <Text style={{ color: colors.text, fontSize: 30, lineHeight: 52, textAlign: "center" }}>{dhikr.arabic}</Text>
          <Text style={{ color: colors.muted, fontSize: 13, textAlign: "center" }}>{dhikr.meaning}</Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Compter ${dhikr.label}. ${count} sur ${dhikr.target}`}
            onPress={increment}
            style={({ pressed }) => ({
              width: 210,
              height: 210,
              borderRadius: 105,
              borderWidth: 8,
              borderColor: progress >= 1 ? colors.success : colors.primary,
              backgroundColor: colors.surfaceAlt,
              alignItems: "center",
              justifyContent: "center",
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <Text style={{ color: colors.text, fontSize: 60, fontWeight: "900", fontVariant: ["tabular-nums"] }}>{count}</Text>
            <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "700" }}>sur {dhikr.target}</Text>
          </Pressable>

          <View style={{ width: "100%", height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: "hidden" }}>
            <View style={{ width: `${Math.round(progress * 100)}%`, height: 8, backgroundColor: colors.primary }} />
          </View>

          <View style={{ flexDirection: "row", gap: 24 }}>
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: "800" }}>{laps}</Text>
              <Text style={{ color: colors.muted, fontSize: 11 }}>cycles terminés</Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: "800" }}>{state.today}</Text>
              <Text style={{ color: colors.muted, fontSize: 11 }}>aujourd’hui</Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={resetCurrent}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingVertical: 11,
              paddingHorizontal: 18,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Ionicons name="refresh-outline" size={18} color={colors.text} />
            <Text style={{ color: colors.text, fontWeight: "700" }}>Remettre à zéro</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
