import BackButton from "../components/BackButton";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../src/theme/ThemeProvider";
import { prefetchQibla, qiblaCache, subscribeQibla } from "../src/lib/qiblaCache";
import { PRAYER_NAMES, computePrayerTimes, formatHHMM } from "../src/lib/prayerCache";
import { loadPrayerPrefs, type PrayerPrefs } from "../src/lib/prayerPrefs";

const prayers = [
  { name: "Fajr", icon: "cloudy-night-outline" as const },
  { name: "Dhuhr", icon: "sunny-outline" as const },
  { name: "Asr", icon: "partly-sunny-outline" as const },
  { name: "Maghrib", icon: "partly-sunny-outline" as const },
  { name: "Isha", icon: "moon-outline" as const },
];

const NO_LOCATION =
  "La localisation est nécessaire pour calculer les horaires de ta position. Autorise-la dans les réglages de ton appareil.";

export default function PrayerScreen() {
  const { colors } = useAppTheme();
  const [prefs, setPrefs] = useState<PrayerPrefs | null>(null);
  const [coords, setCoords] = useState(qiblaCache.coords);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(qiblaCache.coords === null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let active = true;
    void loadPrayerPrefs().then((loaded) => {
      if (active) setPrefs(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  // Même cache de position que la Qibla : dès qu'une position arrive, les horaires se recalculent.
  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeQibla(() => {
      if (!active) return;
      setCoords(qiblaCache.coords);
      setStatus("");
      setLoading(false);
    });

    void prefetchQibla().then(() => {
      if (!active) return;
      if (qiblaCache.coords === null) setStatus(NO_LOCATION);
      setLoading(false);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const refresh = () => {
    setLoading(true);
    setStatus("");
    void prefetchQibla(true).then(() => {
      if (qiblaCache.coords === null) setStatus(NO_LOCATION);
      setLoading(false);
    });
  };

  // Recalculé uniquement si la position, la méthode ou le jour changent.
  const dayKey = new Date(now).toDateString();
  const schedule = useMemo(() => {
    if (!coords || !prefs) return null;
    const today = new Date();
    return {
      today: computePrayerTimes(coords, prefs, today),
      tomorrow: computePrayerTimes(coords, prefs, new Date(today.getTime() + 24 * 60 * 60 * 1000)),
    };
  }, [coords, prefs, dayKey]);

  const nextPrayer = useMemo(() => {
    if (!schedule) return null;
    for (const name of PRAYER_NAMES) {
      const time = schedule.today[name];
      if (time.getTime() > now) return { name, time };
    }
    return { name: "Fajr", time: schedule.tomorrow.Fajr };
  }, [schedule, now]);

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
              ? formatHHMM(nextPrayer.time)
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
                {schedule ? formatHHMM(schedule.today[p.name as keyof typeof schedule.today]) : "--:--"}
              </Text>
            </View>
          ))}

          {loading ? <ActivityIndicator color={colors.primary} /> : null}
          {status ? <Text style={{ color: colors.danger, lineHeight: 20 }}>{status}</Text> : null}

          <Pressable
            onPress={refresh}
            disabled={loading}
            style={{
              backgroundColor: colors.primary,
              borderRadius: 14,
              padding: 13,
              alignItems: "center",
              opacity: loading ? 0.6 : 1,
            }}
          >
            <Text style={{ color: colors.primaryText, fontWeight: "800" }}>
              Actualiser ma position
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}