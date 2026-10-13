import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  DEFAULT_PRAYER_PREFS,
  MADHABS,
  PRAYER_METHODS,
  loadPrayerPrefs,
  savePrayerPrefs,
  type PrayerPrefs,
} from "../../src/lib/prayerPrefs";
import { useAppTheme, type ThemePreference } from "../../src/theme/ThemeProvider";

const THEME_OPTIONS: { label: string; value: ThemePreference; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: "Auto", value: "system", icon: "phone-portrait-outline" },
  { label: "Clair", value: "light", icon: "sunny-outline" },
  { label: "Sombre", value: "dark", icon: "moon-outline" },
];

export default function SettingsScreen() {
  const { colors, preference, setPreference } = useAppTheme();
  const router = useRouter();
  const [prefs, setPrefs] = useState<PrayerPrefs>(DEFAULT_PRAYER_PREFS);

  useEffect(() => {
    let active = true;
    void loadPrayerPrefs().then((loaded) => {
      if (active) setPrefs(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  function updatePrefs(next: PrayerPrefs) {
    setPrefs(next);
    void savePrayerPrefs(next);
  }

  const card = {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
  } as const;

  function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
    return (
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        onPress={onPress}
        style={({ pressed }) => ({
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: selected ? colors.primary : colors.surfaceAlt,
          opacity: pressed ? 0.75 : 1,
        })}
      >
        <Text style={{ color: selected ? colors.primaryText : colors.text, fontSize: 13, fontWeight: "700" }}>{label}</Text>
      </Pressable>
    );
  }

  function LinkRow({ icon, title, subtitle, route }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; route: string }) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(route as never)}
        style={({ pressed }) => ({
          ...card,
          flexDirection: "row",
          alignItems: "center",
          gap: 13,
          padding: 15,
          opacity: pressed ? 0.75 : 1,
        })}
      >
        <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={icon} size={21} color={colors.primary} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: "800" }}>{title}</Text>
          <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Pressable>
    );
  }

  const sectionTitle = { color: colors.text, fontSize: 16, fontWeight: "800", marginBottom: 2 } as const;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 36, gap: 22, width: "100%", maxWidth: 920, alignSelf: "center" }}>
        <View style={{ gap: 7 }}>
          <Text style={{ color: colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1.8 }}>PERSONNALISATION</Text>
          <Text style={{ color: colors.text, fontSize: 31, fontWeight: "800", letterSpacing: -0.8 }}>Réglages</Text>
          <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 22 }}>Adapte ton expérience à tes habitudes et à ton confort de lecture.</Text>
        </View>

        <View style={{ gap: 10 }}>
          <Text style={sectionTitle}>Apparence</Text>
          <View style={{ ...card, padding: 14, gap: 12 }}>
            <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
              « Auto » suit le thème de ton appareil. Ton choix est mémorisé.
            </Text>
            <View accessibilityRole="radiogroup" style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {THEME_OPTIONS.map((option) => (
                <Chip key={option.value} label={option.label} selected={preference === option.value} onPress={() => setPreference(option.value)} />
              ))}
            </View>
          </View>
        </View>

        <View style={{ gap: 10 }}>
          <Text style={sectionTitle}>Horaires de prière</Text>
          <View style={{ ...card, padding: 14, gap: 12 }}>
            <Text style={{ color: colors.muted, fontSize: 12 }}>Méthode de calcul</Text>
            <View accessibilityRole="radiogroup" style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {PRAYER_METHODS.map((method) => (
                <Chip key={method.value} label={method.label} selected={prefs.method === method.value} onPress={() => updatePrefs({ ...prefs, method: method.value })} />
              ))}
            </View>
            <Text style={{ color: colors.muted, fontSize: 12 }}>Calcul de Asr</Text>
            <View accessibilityRole="radiogroup" style={{ flexDirection: "row", gap: 8 }}>
              {MADHABS.map((madhab) => (
                <Chip key={madhab.value} label={madhab.label} selected={prefs.madhab === madhab.value} onPress={() => updatePrefs({ ...prefs, madhab: madhab.value })} />
              ))}
            </View>
          </View>
        </View>

        <View style={{ gap: 10 }}>
          <Text style={sectionTitle}>Raccourcis</Text>
          <LinkRow icon="time-outline" title="Horaires de prière" subtitle="Voir les horaires et le compte à rebours." route="/prayer" />
          <LinkRow icon="compass-outline" title="Direction de la Qibla" subtitle="Autorise la localisation lorsque tu ouvres la Qibla." route="/qibla" />
          <LinkRow icon="book-outline" title="Lecture du Coran" subtitle="Pages mises en cache et lecture hors ligne." route="/quran-reader" />
        </View>

        <View style={{ gap: 10 }}>
          <Text style={sectionTitle}>À propos</Text>
          <View style={{ ...card, padding: 15, gap: 6 }}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: "800" }}>Confidentialité</Text>
            <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
              La localisation est demandée uniquement pour les horaires de prière et la Qibla. Tes préférences et ton compteur restent sur ton appareil.
            </Text>
          </View>
          <View style={{ ...card, padding: 15, flexDirection: "row", alignItems: "center", gap: 13 }}>
            <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: "800" }}>MuslimApp</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>Ton compagnon spirituel au quotidien.</Text>
            </View>
            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "800" }}>Bêta</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
