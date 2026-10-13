
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import * as Location from "expo-location";
import { apiFetch } from "../../src/lib/api";
import { loadPrayerPrefs } from "../../src/lib/prayerPrefs";
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../../src/theme/ThemeProvider";
import createHomeStyles from "@/src/styles/home.styles";

const features = [
  {
    title: "Le Coran",
    subtitle: "Lire et écouter",
    icon: "book-outline" as const,
    route: "/explore",
  },
  {
    title: "Horaires",
    subtitle: "Tes prières",
    icon: "time-outline" as const,
    route: "/explore",
  },
  {
    title: "Qibla",
    subtitle: "Direction de La Mecque",
    icon: "compass-outline" as const,
    route: "/explore",
  },
  {
    title: "Hadiths",
    subtitle: "Les enseignements",
    icon: "library-outline" as const,
    route: "/explore",
  },
  {
    title: "Invocations",
    subtitle: "Duas et adhkar",
    icon: "heart-outline" as const,
    route: "/explore",
  },
  {
    title: "99 noms d'Allah",
    subtitle: "Asma ul Husna",
    icon: "flower-outline" as const,
    route: "/explore",
  },
  {
    title: "Tasbih",
    subtitle: "Compteur de dhikr",
    icon: "radio-button-on-outline" as const,
    route: "/explore",
  },
  {
    title: "Calendrier",
    subtitle: "Date hégirienne",
    icon: "calendar-outline" as const,
    route: "/explore",
  },
];



type Prayer = {
  name: string;
  time: string;
  icon: "cloudy-night-outline" | "sunny-outline" | "partly-sunny-outline" | "moon-outline";
};

const initialPrayerTimes: Prayer[] = [
  { name: "Fajr", time: "--:--", icon: "cloudy-night-outline" },
  { name: "Dhuhr", time: "--:--", icon: "sunny-outline" },
  { name: "Asr", time: "--:--", icon: "partly-sunny-outline" },
  { name: "Maghrib", time: "--:--", icon: "partly-sunny-outline" },
  { name: "Isha", time: "--:--", icon: "moon-outline" },
];

function findValue(value: unknown, keys: string[]): unknown {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findValue(item, keys);
      if (found !== undefined && found !== null) return found;
    }
    return undefined;
  }

  if (!value || typeof value !== "object") return undefined;
  const entries = Object.entries(value as Record<string, unknown>);

  for (const wanted of keys) {
    const entry = entries.find(([key]) => key.toLowerCase() === wanted.toLowerCase());
    if (entry && entry[1] !== undefined && entry[1] !== null) return entry[1];
  }

  for (const [, child] of entries) {
    const found = findValue(child, keys);
    if (found !== undefined && found !== null) return found;
  }
  return undefined;
}

function asTime(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") return "--:--";
  const match = String(value).match(/\b\d{1,2}:\d{2}(?::\d{2})?\b/);
  return match ? match[0].slice(0, 5) : "--:--";
}

function asDisplayText(value: unknown): string | null {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (value && typeof value === "object") {
    const preferred = ["formatted", "readable", "hijri_date", "date", "day", "month", "year"];
    for (const key of preferred) {
      const found = findValue(value, [key]);
      if (typeof found === "string" || typeof found === "number") return String(found);
    }
  }
  return null;
}

export default function DashboardScreen() {
  const { colors, mode, toggleTheme } = useAppTheme();
  const router = useRouter();
  const [prayerTimes, setPrayerTimes] = useState<Prayer[]>(initialPrayerTimes);
  const [prayerStatus, setPrayerStatus] = useState("Chargement des horaires...");
  const [hijriDate, setHijriDate] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadPrayerTimes() {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== "granted") {
          throw new Error("Autorise la localisation pour afficher les horaires locaux.");
        }

        const [position, prefs] = await Promise.all([
          Location.getCurrentPositionAsync({}),
          loadPrayerPrefs(),
        ]);
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
        const response = await apiFetch<unknown>("/prayer-times", {
          params: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            timezone,
            method: prefs.method,
            madhab: prefs.madhab,
            highLatitudeRule: "seventhofthenight",
          },
        });
        if (!mounted) return;

        const keys: Record<string, string[]> = {
          Fajr: ["Fajr"],
          Dhuhr: ["Dhuhr", "Zuhr"],
          Asr: ["Asr"],
          Maghrib: ["Maghrib"],
          Isha: ["Isha"],
        };

        setPrayerTimes(initialPrayerTimes.map((prayer) => ({
          ...prayer,
          time: asTime(findValue(response, keys[prayer.name])),
        })));
        setPrayerStatus("Horaires calculés selon ta localisation.");
      } catch (error) {
        if (!mounted) return;
        setPrayerStatus(error instanceof Error ? error.message : "Impossible de charger les horaires.");
      }
    }

    async function loadHijriDate() {
      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
        const response = await apiFetch<unknown>("/today-hijri", { params: { timezone } });
        if (mounted) setHijriDate(asDisplayText(response));
      } catch {
        // La date hégirienne est secondaire : on garde le tableau de bord utilisable.
      }
    }

    void loadPrayerTimes();
    void loadHijriDate();
    return () => { mounted = false; };
  }, []);

  const styles = useMemo(() => createHomeStyles(colors), [colors]);

  const today = new Intl.DateTimeFormat("fr-CA", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  function openFeature(title: string) {
    const routeByTitle: Record<string, "/quran-reader" | "/prayer" | "/qibla" | "/adhkar" | "/hadith" | "/names" | "/tasbih" | "/hijri" | "/explore"> = {
      "Le Coran": "/quran-reader",
      Horaires: "/prayer",
      "Horaires de prière": "/prayer",
      Qibla: "/qibla",
      Hadiths: "/hadith",
      Invocations: "/adhkar",
      "99 noms d'Allah": "/names",
      Tasbih: "/tasbih",
      Calendrier: "/hijri",
    };
    router.push(routeByTitle[title] ?? "/explore");
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top", "left", "right"]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.brand}>
              <View style={styles.logo}>
                <Ionicons
                  name="moon"
                  size={22}
                  color={colors.primaryText}
                />
              </View>

              <View>
                <Text style={styles.brandName}>MuslimApp</Text>
                <Text style={styles.brandCaption}>
                  Ton compagnon spirituel
                </Text>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={mode === "dark" ? "Activer le thème clair" : "Activer le thème sombre"}
              accessibilityHint="Change immédiatement les couleurs de l’application et mémorise ton choix."
              accessibilityState={{ selected: mode === "light" }}
              hitSlop={8}
              onPress={() => toggleTheme()}
              style={({ pressed }) => [
                styles.themeButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name={mode === "dark" ? "sunny-outline" : "moon-outline"}
                size={22}
                color={colors.text}
              />
            </Pressable>
          </View>

          <View style={styles.greeting}>
            <Text style={styles.date}>{today}</Text>
            <Text style={styles.title}>Assalamu alaykum</Text>
            <Text style={styles.description}>
              Prends un moment pour nourrir ta spiritualité.
            </Text>
          </View>

          <View style={styles.prayerCard}>
            <View style={styles.prayerCardHeader}>
              <View style={styles.prayerHeading}>
                <Ionicons
                  name="time-outline"
                  size={21}
                  color={colors.primary}
                />
                <Text style={styles.sectionTitle}>Horaires de prière</Text>
              </View>

              <Pressable onPress={() => openFeature("Horaires de prière")}>
                <Text style={styles.link}>Détails</Text>
              </Pressable>
            </View>

            <View style={styles.locationRow}>
              <Ionicons
                name="location-outline"
                size={15}
                color={colors.muted}
              />
              <Text style={styles.mutedText}>
                {prayerStatus}
              </Text>
            </View>

            <View style={styles.prayerList}>
              {prayerTimes.map((prayer) => (
                <View key={prayer.name} style={styles.prayerItem}>
                  <Ionicons
                    name={prayer.icon}
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={styles.prayerName}>{prayer.name}</Text>
                  <Text style={styles.prayerTime}>{prayer.time}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.demoNotice}>
              {hijriDate ? `Date hégirienne : ${hijriDate}` : "Horaires récupérés depuis ton API."}
            </Text>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Explorer</Text>
            <Text style={styles.mutedText}>Tout au même endroit</Text>
          </View>

          <View style={styles.featureGrid}>
            {features.map((feature) => (
              <Pressable
                key={feature.title}
                onPress={() => openFeature(feature.title)}
                style={({ pressed }) => [
                  styles.featureCard,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.featureIcon}>
                  <Ionicons
                    name={feature.icon}
                    size={24}
                    color={colors.primary}
                  />
                </View>

                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureSubtitle}>
                  {feature.subtitle}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Reprendre la lecture</Text>
          </View>

          <Pressable
            onPress={() => router.push("/quran-reader")}
            style={({ pressed }) => [
              styles.quranCard,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.quranIcon}>
              <Ionicons
                name="book"
                size={28}
                color={colors.primaryText}
              />
            </View>

            <View style={styles.quranText}>
              <Text style={styles.quranEyebrow}>LE SAINT CORAN</Text>
              <Text style={styles.quranTitle}>Al-Fatiha</Text>
              <Text style={styles.quranSubtitle}>
                Sourate 1 · 7 versets
              </Text>
            </View>

            <Ionicons
              name="arrow-forward-circle-outline"
              size={28}
              color={colors.primary}
            />
          </Pressable>

          <Text style={styles.footer}>
            MuslimApp · Un pas à la fois
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
