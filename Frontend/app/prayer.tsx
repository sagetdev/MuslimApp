import AsyncStorage from "@react-native-async-storage/async-storage";
import BackButton from "../components/BackButton";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiFetch } from "../src/lib/api";
import { useAppTheme } from "../src/theme/ThemeProvider";

const PREF_KEY = "muslimapp:prayer-preferences:v1";

const prayers = [
  { name: "Fajr", icon: "cloudy-night-outline" as const },
  { name: "Dhuhr", icon: "sunny-outline" as const },
  { name: "Asr", icon: "partly-sunny-outline" as const },
  { name: "Maghrib", icon: "partly-sunny-outline" as const },
  { name: "Isha", icon: "moon-outline" as const },
];

const methods = [
  { label: "Muslim World League", value: "MWL" },
  { label: "Umm Al-Qura", value: "UmmAlQura" },
  { label: "Egyptian", value: "Egyptian" },
  { label: "Karachi", value: "Karachi" },
  { label: "North America (ISNA)", value: "ISNA" },
];

function findTimes(value: unknown): Record<string, string> {
  const out: Record<string, string> = {};

  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    const obj = node as Record<string, unknown>;
    for (const p of prayers) {
      const v = obj[p.name];
      if (typeof v === "string" || typeof v === "number") {
        const m = String(v).match(/\d{1,2}:\d{2}/);
        if (m) out[p.name] = m[0];
      }
    }
    Object.values(obj).forEach(visit);
  };

  visit(value);
  return out;
}

export default function PrayerScreen() {
  const { colors } = useAppTheme();
  const [times, setTimes] = useState<Record<string, string>>({});
  const [method, setMethod] = useState("MWL");
  const [madhab, setMadhab] = useState("shafi");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [nextPrayer, setNextPrayer] = useState<{ name: string; time: Date } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setStatus("");
    try {
      const raw = await AsyncStorage.getItem(PREF_KEY);
      if (raw) {
        const pref = JSON.parse(raw) as { method?: string; madhab?: string };
        if (pref.method) setMethod(pref.method);
        if (pref.madhab) setMadhab(pref.madhab);
      }
      const perm = await Location.getForegroundPermissionsAsync();
      if (perm.status !== "granted") {
        throw new Error("La localisation est nécessaire pour calculer les horaires de ta position.");
      }
      const pos = await Location.getCurrentPositionAsync({});
      const result = await apiFetch<unknown>("/prayer-times", {
        params: {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          method,
          madhab,
          highLatitudeRule: "seventhofthenight",
        },
      });
      setTimes(findTimes(result));
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Impossible de charger les horaires.");
    } finally {
      setLoading(false);
    }
  }, [method, madhab]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const today = new Date(now);
    const candidates = prayers
      .flatMap((p) => {
        const raw = times[p.name];
        if (!raw) return [];
        const [h, m] = raw.split(":").map(Number);
        const d = new Date(today);
        d.setHours(h, m, 0, 0);
        if (d.getTime() <= now) d.setDate(d.getDate() + 1);
        return [{ name: p.name, time: d }];
      })
      .sort((a, b) => a.time.getTime() - b.time.getTime());

    setNextPrayer(candidates[0] ?? null);
  }, [times, now]);

  const save = async (m: string, md: string) => {
    setMethod(m);
    setMadhab(md);
    await AsyncStorage.setItem(PREF_KEY, JSON.stringify({ method: m, madhab: md }));
  };

  const countdown = nextPrayer
    ? (() => {
        const seconds = Math.max(0, Math.floor((nextPrayer.time.getTime() - now) / 1000));
        return `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(
          Math.floor((seconds % 3600) / 60)
        ).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
      })()
    : "--:--:--";

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
        <BackButton />
        <View style={{ gap: 6 }}>
          <Text style={{ color: colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1.8 }}>
            TON QUOTIDIEN
          </Text>
          <Text style={{ color: colors.text, fontSize: 30, fontWeight: "800" }}>
            Horaires de prière
          </Text>
          <Text style={{ color: colors.muted, lineHeight: 21 }}>
            Des horaires adaptés à ta position et à ta méthode de calcul.
          </Text>
        </View>

        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 24,
            padding: 20,
            gap: 10,
          }}
        >
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700" }}>
            PROCHAINE PRIÈRE
          </Text>
          <Text style={{ color: colors.text, fontSize: 25, fontWeight: "800" }}>
            {nextPrayer?.name ?? "Calcul en cours"}
          </Text>
          <Text style={{ color: colors.primary, fontSize: 34, fontWeight: "900", fontVariant: ["tabular-nums"] }}>
            {countdown}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            {nextPrayer
              ? nextPrayer.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "Active la localisation pour commencer"}
          </Text>
        </View>

        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 22,
            padding: 16,
            gap: 8,
          }}
        >
          {prayers.map((p) => (
            <View
              key={p.name}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 11,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <Ionicons name={p.icon} size={22} color={colors.primary} />
              <Text style={{ flex: 1, color: colors.text, fontWeight: "700" }}>
                {p.name}
              </Text>
              <Text style={{ color: colors.text, fontSize: 17, fontWeight: "800", fontVariant: ["tabular-nums"] }}>
                {times[p.name] ?? "--:--"}
              </Text>
            </View>
          ))}

          {loading ? <ActivityIndicator color={colors.primary} /> : null}
          {status ? <Text style={{ color: "#E57373", lineHeight: 20 }}>{status}</Text> : null}

          <Pressable
            onPress={() => void load()}
            style={{
              backgroundColor: colors.primary,
              borderRadius: 14,
              padding: 13,
              alignItems: "center",
            }}
          >
            <Text style={{ color: colors.primaryText, fontWeight: "800" }}>
              Actualiser les horaires
            </Text>
          </Pressable>
        </View>

        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 22,
            padding: 17,
            gap: 15,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "800" }}>
            Paramètres de calcul
          </Text>

          <Text style={{ color: colors.muted, fontSize: 12 }}>Méthode</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {methods.map((m) => (
              <Pressable
                key={m.value}
                onPress={() => void save(m.value, madhab)}
                style={{
                  padding: 10,
                  borderRadius: 12,
                  backgroundColor: method === m.value ? colors.primary : colors.surfaceAlt,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text
                  style={{
                    color: method === m.value ? colors.primaryText : colors.text,
                    fontSize: 12,
                    fontWeight: "700",
                  }}
                >
                  {m.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={{ color: colors.muted, fontSize: 12 }}>Calcul de Asr</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[
              { label: "Shafi'i", value: "shafi" },
              { label: "Hanafi", value: "hanafi" },
            ].map((m) => (
              <Pressable
                key={m.value}
                onPress={() => void save(method, m.value)}
                style={{
                  padding: 11,
                  borderRadius: 12,
                  backgroundColor: madhab === m.value ? colors.primary : colors.surfaceAlt,
                }}
              >
                <Text style={{ color: madhab === m.value ? colors.primaryText : colors.text, fontWeight: "700" }}>
                  {m.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}