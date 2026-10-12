import { Ionicons } from "@expo/vector-icons";
import { ScrollView, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../../src/theme/ThemeProvider";

export default function SettingsScreen() {
  const { colors, mode, toggleTheme } = useAppTheme();

  const Row = ({
    icon,
    title,
    subtitle,
    onPress,
    trailing,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle: string;
    onPress?: () => void;
    trailing?: string;
  }) => (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 13,
        paddingVertical: 16,
        paddingHorizontal: 15,
        backgroundColor: colors.surface,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border,
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
      {trailing ? <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "800" }}>{trailing}</Text> : onPress ? <Ionicons name="chevron-forward" size={18} color={colors.muted} /> : null}
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 36, gap: 22, width: "100%", maxWidth: 920, alignSelf: "center" }}>
        <View style={{ gap: 7 }}>
          <Text style={{ color: colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1.8 }}>PERSONNALISATION</Text>
          <Text style={{ color: colors.text, fontSize: 31, fontWeight: "800", letterSpacing: -0.8 }}>Réglages</Text>
          <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 22 }}>Adapte ton expérience à tes habitudes et à ton confort de lecture.</Text>
        </View>

        <View style={{ gap: 10 }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800", marginBottom: 2 }}>Apparence</Text>
          <Row
            icon={mode === "dark" ? "moon-outline" : "sunny-outline"}
            title="Thème de l’application"
            subtitle="Choisis une interface sombre ou claire."
            trailing={mode === "dark" ? "Sombre" : "Clair"}
            onPress={toggleTheme}
          />
        </View>

        <View style={{ gap: 10 }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800", marginBottom: 2 }}>Préférences</Text>
          <Row icon="time-outline" title="Horaires de prière" subtitle="Les horaires sont calculés selon ta localisation et les paramètres actuels." trailing="MWL" />
          <Row icon="compass-outline" title="Direction de la Qibla" subtitle="Autorise la localisation lorsque tu ouvres la fonctionnalité Qibla." />
          <Row icon="book-outline" title="Lecture du Coran" subtitle="Le lecteur utilise les ressources disponibles dans l’application, y compris les pages mises en cache." />
        </View>

        <View style={{ gap: 10 }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800", marginBottom: 2 }}>À propos</Text>
          <Row icon="shield-checkmark-outline" title="Confidentialité" subtitle="La localisation est demandée uniquement pour les fonctions qui en ont besoin." />
          <Row icon="information-circle-outline" title="MuslimApp" subtitle="Ton compagnon spirituel au quotidien." trailing="Bêta" />
        </View>

        <Text style={{ color: colors.muted, fontSize: 11, textAlign: "center", lineHeight: 17 }}>
          Les réglages qui nécessitent un stockage persistant ou des écrans dédiés seront activés au fur et à mesure de leur implémentation.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
