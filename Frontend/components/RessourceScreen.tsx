import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiFetch } from "../src/lib/api";
import { useAppTheme } from "../src/theme/ThemeProvider";
import createExploreStyles from "../src/styles/explore.styles";
import BackButton from "./BackButton";

export type ResourceConfig = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  endpoint: string;
  searchEndpoint?: string;
  searchParam?: string;
  initialSearch?: boolean;
  includeTimezone?: boolean;
};

function unwrapResponse(value: unknown): unknown {
  if (value && typeof value === "object" && !Array.isArray(value) && "data" in value) {
    return (value as { data: unknown }).data;
  }
  return value;
}

function formatKey(key: string): string {
  return key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ResourceValue({ value }: { value: unknown }) {
  const { colors } = useAppTheme();
  const styles = createExploreStyles(colors);
  if (value === null || value === undefined || value === "") return null;

  if (["string", "number", "boolean"].includes(typeof value)) {
    return <Text style={[styles.valueText, { color: colors.text }]}>{String(value)}</Text>;
  }
  if (Array.isArray(value)) {
    if (!value.length) return <Text style={{ color: colors.muted }}>Aucun résultat.</Text>;
    return (
      <View style={{ gap: 10 }}>
        {value.slice(0, 60).map((item, index) => (
          <View key={`item-${index}`} style={[styles.dataCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.itemIndex, { color: colors.primary }]}>#{index + 1}</Text>
            <ResourceValue value={item} />
          </View>
        ))}
        {value.length > 60 ? <Text style={{ color: colors.muted }}>Affichage limité aux 60 premiers résultats.</Text> : null}
      </View>
    );
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, child]) => child !== undefined && child !== null && child !== "");
    return (
      <View style={{ gap: 10 }}>
        {entries.map(([key, child]) => (
          <View key={key} style={{ gap: 5 }}>
            <Text style={[styles.fieldLabel, { color: colors.primary }]}>{formatKey(key)}</Text>
            <ResourceValue value={child} />
          </View>
        ))}
      </View>
    );
  }
  return null;
}

export default function ResourceScreen({ config }: { config: ResourceConfig }) {
  const { colors } = useAppTheme();
  const styles = createExploreStyles(colors);
  const [query, setQuery] = useState("");
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const loadData = useCallback(async (searchText = "") => {
    setLoading(true);
    setError(null);
    try {
      const search = searchText.trim();
      const result = config.searchEndpoint && search
        ? await apiFetch<unknown>(config.searchEndpoint, { params: { [config.searchParam ?? "q"]: search, limit: 25 } })
        : await apiFetch<unknown>(config.endpoint, config.includeTimezone
            ? { params: { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" } }
            : undefined);
      setData(unwrapResponse(result));
      setLoaded(true);
    } catch (caught) {
      setData(null);
      setError(caught instanceof Error ? caught.message : "Une erreur inconnue est survenue.");
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => { void loadData(config.initialSearch ? "" : ""); }, [loadData]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <BackButton />
        <View style={styles.heading}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>MUSLIMAPP</Text>
          <Text style={[styles.title, { color: colors.text }]}>{config.title}</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>{config.subtitle}</Text>
        </View>

        <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.panelHeading}>
            <View style={[styles.moduleIcon, { backgroundColor: colors.surfaceAlt }]}>
              <Ionicons name={config.icon} size={23} color={colors.primary} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[styles.panelTitle, { color: colors.text }]}>{config.title}</Text>
              <Text style={[styles.panelSubtitle, { color: colors.muted }]}>Données chargées depuis ton backend.</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Actualiser" onPress={() => void loadData(query)}>
              <Ionicons name="refresh-outline" size={22} color={colors.primary} />
            </Pressable>
          </View>

          {config.searchEndpoint ? (
            <>
              <View style={[styles.searchBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Ionicons name="search-outline" size={19} color={colors.muted} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  onSubmitEditing={() => void loadData(query)}
                  placeholder="Rechercher..."
                  placeholderTextColor={colors.muted}
                  returnKeyType="search"
                  style={[styles.searchInput, { color: colors.text }]}
                />
                {query.length > 0 ? (
                  <Pressable accessibilityRole="button" accessibilityLabel="Effacer la recherche" onPress={() => { setQuery(""); void loadData(""); }}>
                    <Ionicons name="close-circle" size={19} color={colors.muted} />
                  </Pressable>
                ) : null}
              </View>
              <Pressable accessibilityRole="button" onPress={() => void loadData(query)} style={[styles.searchButton, { backgroundColor: colors.primary }]}>
                <Text style={{ color: colors.primaryText, fontWeight: "700" }}>Rechercher / Charger</Text>
              </Pressable>
            </>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.feedback}><ActivityIndicator size="large" color={colors.primary} /><Text style={{ color: colors.muted }}>Chargement depuis le backend...</Text></View>
        ) : error ? (
          <View style={[styles.errorCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="alert-circle-outline" size={28} color="#E57373" />
            <Text style={[styles.errorTitle, { color: colors.text }]}>Impossible de charger les données</Text>
            <Text style={[styles.errorText, { color: colors.muted }]}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={() => void loadData()} style={[styles.searchButton, { backgroundColor: colors.primary }]}>
              <Text style={{ color: colors.primaryText, fontWeight: "700" }}>Réessayer</Text>
            </Pressable>
          </View>
        ) : data !== null ? (
          <View style={{ gap: 12 }}><Text style={[styles.resultTitle, { color: colors.text }]}>Résultats</Text><ResourceValue value={data} /></View>
        ) : loaded ? (
          <View style={styles.feedback}><Text style={{ color: colors.muted }}>Aucune donnée à afficher.</Text></View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
