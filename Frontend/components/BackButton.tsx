import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, Text } from "react-native";
import { useAppTheme } from "../src/theme/ThemeProvider";

export default function BackButton() {
  const router = useRouter();
  const { colors } = useAppTheme();

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/explore");
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Retour à la page précédente"
      onPress={goBack}
      hitSlop={8}
      style={({ pressed }) => ({
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 14,
        marginBottom: 4,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Ionicons name="arrow-back" size={18} color={colors.text} />
      <Text style={{ color: colors.text, fontSize: 13, fontWeight: "800" }}>Retour</Text>
    </Pressable>
  );
}
