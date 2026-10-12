import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScrollView, Text, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../../src/theme/ThemeProvider";
import createExploreStyles from "@/src/styles/explore.styles";

const pages = [
  { title: "Le Coran", subtitle: "Lire et rechercher les sourates", icon: "book-outline" as const, route: "/quran-reader" as const },
  { title: "Horaires de prière", subtitle: "Consulter les heures selon ta localisation", icon: "time-outline" as const, route: "/prayer" as const },
  { title: "Qibla", subtitle: "Trouver la direction de La Mecque", icon: "compass-outline" as const, route: "/qibla" as const },
  { title: "Hadiths", subtitle: "Découvrir les enseignements prophétiques", icon: "library-outline" as const, route: "/hadith" as const },
  { title: "Invocations", subtitle: "Retrouver les duas et adhkar", icon: "heart-outline" as const, route: "/adhkar" as const },
  { title: "Les 99 noms d’Allah", subtitle: "Explorer les beaux noms d’Allah", icon: "flower-outline" as const, route: "/names" as const },
  { title: "Date hégirienne", subtitle: "Consulter le calendrier hégirien", icon: "calendar-outline" as const, route: "/hijri" as const },
];

export default function ExploreScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const styles = createExploreStyles(colors);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heading}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>MUSLIMAPP</Text>
          <Text style={[styles.title, { color: colors.text }]}>Explorer</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Tes ressources islamiques, chacune avec son propre écran.
          </Text>
        </View>

        <View style={{ gap: 12 }}>
          {pages.map((page) => (
            <Pressable
              key={page.route}
              accessibilityRole="button"
              accessibilityLabel={`Ouvrir ${page.title}`}
              onPress={() => router.push(page.route)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                padding: 16,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <View style={{ width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceAlt }}>
                <Ionicons name={page.icon} size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: "800" }}>{page.title}</Text>
                <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>{page.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
