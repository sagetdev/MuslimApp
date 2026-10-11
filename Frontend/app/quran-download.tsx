import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuranBundle } from "../src/hooks/useQuranBundle";
import { useAppTheme } from "../src/theme/ThemeProvider";

export default function QuranDownloadScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { state, download, remove } = useQuranBundle();

  const percent = state.progress ? Math.round(state.progress.ratio * 100) : 0;
  const mb = state.progress
    ? (state.progress.bytesWritten / (1024 * 1024)).toFixed(1)
    : "0";
  const totalMb = state.progress && state.progress.bytesTotal > 0
    ? (state.progress.bytesTotal / (1024 * 1024)).toFixed(1)
    : "?";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "left", "right"]}>
      <View style={{ flexDirection: "row", alignItems: "center", padding: 16 }}>
        <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700", marginLeft: 8 }}>
          Coran hors ligne
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        <View
          style={{
            padding: 20,
            borderRadius: 18,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            gap: 12,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Ionicons name="cloud-download-outline" size={26} color={colors.primary} />
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: "700" }}>
              Télécharger le Coran complet
            </Text>
          </View>
          <Text style={{ color: colors.muted, lineHeight: 20 }}>
            Télécharge les 604 pages en une seule fois (~5 Mo) pour une lecture
            instantanée, même sans connexion.
          </Text>
        </View>

        {state.downloaded ? (
          <View style={{ gap: 12 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                padding: 16,
                borderRadius: 14,
                backgroundColor: colors.surfaceAlt,
              }}
            >
              <Ionicons name="checkmark-circle" size={24} color={colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: "700" }}>
                  Coran disponible hors ligne
                </Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                  {state.pages} pages · version {state.version ?? "?"}
                </Text>
              </View>
            </View>

            {state.hasUpdate ? (
              <Pressable
                onPress={download}
                style={{
                  padding: 14,
                  borderRadius: 14,
                  backgroundColor: colors.primary,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: colors.primaryText, fontWeight: "700" }}>
                  Mettre à jour le bundle
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={remove}
              style={{
                padding: 14,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: "center",
              }}
            >
              <Text style={{ color: colors.text, fontWeight: "600" }}>
                Supprimer les données téléchargées
              </Text>
            </Pressable>
          </View>
        ) : state.downloading ? (
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: colors.text, fontWeight: "600" }}>
                {state.progress?.phase === "downloading"
                  ? "Téléchargement..."
                  : state.progress?.phase === "parsing"
                  ? "Analyse..."
                  : "Mise en cache..."}
              </Text>
              <Text style={{ color: colors.muted }}>{percent}%</Text>
            </View>

            <View
              style={{
                height: 8,
                backgroundColor: colors.surfaceAlt,
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  width: `${percent}%`,
                  height: "100%",
                  backgroundColor: colors.primary,
                }}
              />
            </View>

            {state.progress?.phase === "downloading" && state.progress.bytesTotal > 0 ? (
              <Text style={{ color: colors.muted, fontSize: 12, textAlign: "center" }}>
                {mb} / {totalMb} Mo
              </Text>
            ) : null}
          </View>
        ) : (
          <Pressable
            onPress={download}
            style={{
              padding: 18,
              borderRadius: 16,
              backgroundColor: colors.primary,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <Ionicons name="download-outline" size={20} color={colors.primaryText} />
            <Text style={{ color: colors.primaryText, fontWeight: "700", fontSize: 15 }}>
              Télécharger (~5 Mo)
            </Text>
          </Pressable>
        )}

        {state.error ? (
          <View
            style={{
              padding: 14,
              borderRadius: 12,
              backgroundColor: "#3A1B1B",
              borderWidth: 1,
              borderColor: "#E57373",
            }}
          >
            <Text style={{ color: "#E57373", fontSize: 13 }}>{state.error}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}