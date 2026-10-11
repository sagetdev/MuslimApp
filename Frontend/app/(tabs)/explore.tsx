import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as Location from "expo-location";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiFetch } from "../../src/lib/api";
import { useAppTheme } from "../../src/theme/ThemeProvider";
import createExploreStyles from "@/src/styles/explore.styles";

type ModuleId = "quran" | "prayer" | "qibla" | "hadith" | "duas" | "names" | "hijri";

const modules: { id: ModuleId; title: string; icon: keyof typeof Ionicons.glyphMap; searchable?: boolean }[] = [
  { id: "quran", title: "Coran", icon: "book-outline", searchable: true },
  { id: "prayer", title: "Prières", icon: "time-outline" },
  { id: "qibla", title: "Qibla", icon: "compass-outline" },
  { id: "hadith", title: "Hadiths", icon: "library-outline", searchable: true },
  { id: "duas", title: "Invocations", icon: "heart-outline", searchable: true },
  { id: "names", title: "99 noms", icon: "flower-outline", searchable: true },
  { id: "hijri", title: "Date hégirienne", icon: "calendar-outline" },
];

function unwrapResponse(value: unknown): unknown {
  if (value && typeof value === "object" && !Array.isArray(value) && "data" in value) {
    return (value as { data: unknown }).data;
  }
  return value;
}

function formatKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ValueView({ value, depth = 0 }: { value: unknown; depth?: number }) {
  const { colors } = useAppTheme();
  const styles = createExploreStyles(colors);

  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return <Text style={[styles.valueText, { color: colors.text }]}>{String(value)}</Text>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <Text style={{ color: colors.muted }}>Aucun résultat.</Text>;
    return (
      <View style={{ gap: 10 }}>
        {value.slice(0, 60).map((item, index) => (
          <View
            key={`item-${index}`}
            style={[styles.dataCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={[styles.itemIndex, { color: colors.primary }]}>#{index + 1}</Text>
            <ValueView value={item} depth={depth + 1} />
          </View>
        ))}
        {value.length > 60 ? (
          <Text style={{ color: colors.muted }}>Affichage limité aux 60 premiers résultats.</Text>
        ) : null}
      </View>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, child]) => child !== undefined);
    if (!entries.length) return null;

    return (
      <View style={{ gap: 10 }}>
        {entries.map(([key, child]) => {
          if (child === null || child === undefined || child === "") return null;
          const isSimple = ["string", "number", "boolean"].includes(typeof child);
          return (
            <View key={key} style={{ gap: 5 }}>
              <Text style={[styles.fieldLabel, { color: colors.primary }]}>{formatKey(key)}</Text>
              {isSimple ? (
                <Text style={[styles.valueText, { color: colors.text }]}>{String(child)}</Text>
              ) : (
                <ValueView value={child} depth={depth + 1} />
              )}
            </View>
          );
        })}
      </View>
    );
  }

  return null;
}

async function getCoordinates() {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== "granted") {
    throw new Error("Autorise la localisation pour utiliser cette fonctionnalité.");
  }
  const position = await Location.getCurrentPositionAsync({});
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  };
}

export default function ExploreScreen() {
  const { colors } = useAppTheme();
  const params = useLocalSearchParams<{ module?: string | string[] }>();
  const initialModule = Array.isArray(params.module) ? params.module[0] : params.module;
  const [selected, setSelected] = useState<ModuleId>(
    modules.some((item) => item.id === initialModule) ? (initialModule as ModuleId) : "quran"
  );
  const [query, setQuery] = useState("");
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const activeModule = useMemo(
    () => modules.find((item) => item.id === selected) ?? modules[0],
    [selected]
  );

  const styles = useMemo(
    () => createExploreStyles(colors),
    [colors]
  );

  const loadData = useCallback(async (searchText = query) => {
    setLoading(true);
    setError(null);
    try {
      let result: unknown;
      const search = searchText.trim();

      switch (selected) {
        case "quran": {
          if (search && /^\d{1,3}$/.test(search) && Number(search) >= 1 && Number(search) <= 114) {
            result = await apiFetch<unknown>(`/quran/surahs/${Number(search)}`);
          } else if (search) {
            result = await apiFetch<unknown>("/quran/search", {
              params: { q: search, translation: "french", limit: 25 },
            });
          } else {
            result = await apiFetch<unknown>("/quran/surahs");
          }
          break;
        }
        case "prayer": {
          const location = await getCoordinates();
          result = await apiFetch<unknown>("/prayer-times", {
            params: {
              lat: location.lat,
              lng: location.lng,
              timezone: location.timezone,
              method: "MWL",
              madhab: "shafi",
              highLatitudeRule: "seventhofthenight",
            },
          });
          break;
        }
        case "qibla": {
          const location = await getCoordinates();
          result = await apiFetch<unknown>("/qibla", {
            params: { lat: location.lat, lng: location.lng },
          });
          break;
        }
        case "hadith":
          result = search
            ? await apiFetch<unknown>("/hadith/search", { params: { q: search, limit: 25 } })
            : await apiFetch<unknown>("/hadith/random");
          break;
        case "duas":
          result = search
            ? await apiFetch<unknown>("/duas/search", { params: { q: search } })
            : await apiFetch<unknown>("/duas");
          break;
        case "names":
          result = search
            ? await apiFetch<unknown>("/asma-ul-husna/search", { params: { q: search } })
            : await apiFetch<unknown>("/asma-ul-husna");
          break;
        case "hijri": {
          const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
          result = await apiFetch<unknown>("/today-hijri", { params: { timezone } });
          break;
        }
      }

      setData(unwrapResponse(result));
      setLoaded(true);
    } catch (caught) {
      setData(null);
      setError(caught instanceof Error ? caught.message : "Une erreur inconnue est survenue.");
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [query, selected]);

  useEffect(() => {
    setQuery("");
    setData(null);
    setLoaded(false);
    void loadData("");
  }, [selected]); // Chargement lors du changement de module.

  useEffect(() => {
    if (initialModule && modules.some((item) => item.id === initialModule)) {
      setSelected(initialModule as ModuleId);
    }
  }, [initialModule]);

  const stylesWithTheme = {
    backgroundColor: colors.background,
  };

  return (
    <SafeAreaView style={[styles.container, stylesWithTheme]} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.heading}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>MUSLIMAPP</Text>
          <Text style={[styles.title, { color: colors.text }]}>Explorer</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Tes ressources islamiques, réunies au même endroit.
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moduleList}>
          {modules.map((item) => {
            const active = selected === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setSelected(item.id)}
                style={[
                  styles.moduleButton,
                  {
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Ionicons name={item.icon} size={17} color={active ? colors.primaryText : colors.text} />
                <Text style={{ color: active ? colors.primaryText : colors.text, fontWeight: "600" }}>
                  {item.title}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.panelHeading}>
            <View style={[styles.moduleIcon, { backgroundColor: colors.surfaceAlt }]}>
              <Ionicons name={activeModule.icon} size={23} color={colors.primary} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[styles.panelTitle, { color: colors.text }]}>{activeModule.title}</Text>
              <Text style={[styles.panelSubtitle, { color: colors.muted }]}>
                {selected === "quran" ? "Entre un numéro de sourate ou un mot à rechercher." :
                  activeModule.searchable ? "Recherche dans les données disponibles." :
                    "Données chargées depuis ton backend."}
              </Text>
            </View>
            <Pressable onPress={() => void loadData()} accessibilityLabel="Actualiser">
              <Ionicons name="refresh-outline" size={22} color={colors.primary} />
            </Pressable>
          </View>

          {activeModule.searchable ? (
            <View style={[styles.searchBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Ionicons name="search-outline" size={19} color={colors.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={() => void loadData(query)}
                placeholder={selected === "quran" ? "Sourate (1–114) ou recherche..." : "Rechercher..."}
                placeholderTextColor={colors.muted}
                returnKeyType="search"
                style={[styles.searchInput, { color: colors.text }]}
              />
              {query.length > 0 ? (
                <Pressable onPress={() => { setQuery(""); void loadData(""); }} accessibilityLabel="Effacer la recherche">
                  <Ionicons name="close-circle" size={19} color={colors.muted} />
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {activeModule.searchable ? (
            <Pressable
              onPress={() => void loadData(query)}
              style={[styles.searchButton, { backgroundColor: colors.primary }]}
            >
              <Text style={{ color: colors.primaryText, fontWeight: "700" }}>Rechercher / Charger</Text>
            </Pressable>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.feedback}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ color: colors.muted }}>Chargement depuis le backend...</Text>
          </View>
        ) : error ? (
          <View style={[styles.errorCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="alert-circle-outline" size={28} color="#E57373" />
            <Text style={[styles.errorTitle, { color: colors.text }]}>Impossible de charger les données</Text>
            <Text style={[styles.errorText, { color: colors.muted }]}>{error}</Text>
            <Pressable onPress={() => void loadData()} style={[styles.searchButton, { backgroundColor: colors.primary }]}>
              <Text style={{ color: colors.primaryText, fontWeight: "700" }}>Réessayer</Text>
            </Pressable>
          </View>
        ) : data !== null ? (
          <View style={{ gap: 12 }}>
            <Text style={[styles.resultTitle, { color: colors.text }]}>Résultats</Text>
            <ValueView value={data} />
          </View>
        ) : loaded ? (
          <View style={styles.feedback}>
            <Text style={{ color: colors.muted }}>Aucune donnée à afficher.</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}


