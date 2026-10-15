import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiFetch } from "../src/lib/api";
import { useAppTheme } from "../src/theme/ThemeProvider";
import createExploreStyles from "../src/styles/explore.styles";
import BackButton from "./BackButton";
import { DetailCard } from "./ResourceDetails";
export type { ResourceConfig } from "./resource.utils";
import {
  type ResourceConfig,
  type RecordValue,
  unwrapResponse,
  toRecords,
  getText,
  getId,
  getTitle,
  labelFor,
  slugFor,
  categoryIconFor,
  buildHadith,
  buildName,
  ResourceValue,
} from "./resource.utils";

export default function ResourceScreen({ config }: { config: ResourceConfig }) {
  const { colors } = useAppTheme();
  const styles = createExploreStyles(colors);
  const kind = config.kind ?? "generic";
  const [query, setQuery] = useState("");
  const [data, setData] = useState<unknown>(null);
  const [collections, setCollections] = useState<RecordValue[]>([]);
  const [categories, setCategories] = useState<unknown[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<{ label: string; slug: string } | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<{ label: string; slug: string } | null>(null);
  const [selectedItem, setSelectedItem] = useState<RecordValue | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const request = useCallback(async (endpoint: string, params?: Record<string, string | number>) => {
    const result = await apiFetch<unknown>(endpoint, params ? { params } : undefined);
    return unwrapResponse(result);
  }, []);

  const loadMain = useCallback(async (searchText = "") => {
    setLoading(true);
    setError(null);
    try {
      if (kind === "duas") {
        const result = await request(searchText.trim() ? "/duas/search" : "/duas/categories", searchText.trim() ? { q: searchText.trim(), limit: 50 } : undefined);
        if (searchText.trim()) {
          setSelectedCategory(null);
          setCategories([]);
          setData(result);
        } else {
          const raw = unwrapResponse(result);
          const array = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? Object.values(raw as RecordValue).find(Array.isArray) as unknown[] | undefined : undefined;
          setCategories(array ?? []);
          setData(null);
        }
      } else if (kind === "names") {
        setData(await request(searchText.trim() && config.searchEndpoint ? config.searchEndpoint : config.endpoint, searchText.trim() ? { [config.searchParam ?? "q"]: searchText.trim(), limit: 99 } : undefined));
      } else if (kind === "hadith") {
        if (searchText.trim()) {
          setData(await request(config.searchEndpoint ?? "/hadith/search", { q: searchText.trim(), limit: 40, ...(selectedCollection ? { collection: selectedCollection.slug } : {}) }));
        } else if (selectedCollection) {
          setData(await request(`/hadith/${encodeURIComponent(selectedCollection.slug)}`, { page: 1, limit: 40 }));
        } else {
          const rawCollections = await request("/hadith/collections");
          const raw = unwrapResponse(rawCollections);
          const array = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? Object.values(raw as RecordValue).find(Array.isArray) as unknown[] | undefined : undefined;
          const normalized = (array ?? []).map((item, index) => {
            if (typeof item === "string") return { id: item, name: item, slug: item, _index: index };
            return item && typeof item === "object" ? item as RecordValue : { id: String(index + 1), name: String(item) };
          });
          setCollections(normalized);
          setData(null);
        }
      } else {
        const result = searchText.trim() && config.searchEndpoint
          ? await request(config.searchEndpoint, { [config.searchParam ?? "q"]: searchText.trim(), limit: 25 })
          : await request(config.endpoint, config.includeTimezone ? { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" } : undefined);
        setData(result);
      }
      setLoaded(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Une erreur est survenue.");
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [config, kind, request, selectedCollection]);

  const loadCategory = useCallback(async (category: { label: string; slug: string }) => {
    setSelectedCategory(category);
    setSelectedItem(null);
    setLoading(true);
    setError(null);
    try {
      setData(await request(`/duas/category/${encodeURIComponent(category.slug)}`));
      setLoaded(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible de charger cette catégorie.");
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    void loadMain("");
  }, [loadMain]);

  const records = useMemo(() => toRecords(data), [data]);
  const selectedIndex = selectedItem ? records.findIndex((item) => item === selectedItem || getId(item, records.indexOf(item)) === getId(selectedItem, 0)) : -1;

  const chooseCollection = (item: RecordValue, index: number) => {
    const label = getTitle(item, index);
    const slug = getText(item, ["slug", "key", "collection", "name", "title", "id"]).toLowerCase().replace(/\\s+/g, "");
    if (!slug) return;
    setSelectedCollection({ label, slug });
    setSelectedItem(null);
    setQuery("");
  };

  const showCategories = kind === "duas" && !selectedCategory && !query.trim();
  const showCollections = kind === "hadith" && !selectedCollection && !query.trim();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <BackButton />
        <View style={styles.heading}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>MUSLIMAPP · APPRENDRE</Text>
          <Text style={[styles.title, { color: colors.text }]}>{config.title}</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>{config.subtitle}</Text>
        </View>

        <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 22, padding: 16, gap: 13 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={config.icon} size={23} color={colors.primary} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}>
                {showCategories ? "Choisis un thème" : showCollections ? "Choisis un recueil" : kind === "names" ? "Découvrir les noms" : selectedCategory?.label ?? selectedCollection?.label ?? "Explorer les ressources"}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
                {showCategories ? "Parcours les catégories disponibles et ouvre celles qui t’intéressent." : showCollections ? "Sélectionne une collection pour commencer la lecture." : kind === "names" ? "Ouvre une carte pour découvrir sa signification." : "Recherche dans les ressources disponibles."}
              </Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Actualiser" onPress={() => void loadMain(query)} style={{ padding: 7 }}>
              <Ionicons name="refresh-outline" size={21} color={colors.primary} />
            </Pressable>
          </View>
          {(config.searchEndpoint || kind === "duas") ? (
            <View style={[styles.searchBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Ionicons name="search-outline" size={19} color={colors.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={() => {
                  if (kind === "duas" && !query.trim()) void loadMain("");
                  else void loadMain(query);
                }}
                placeholder={kind === "names" ? "Rechercher un nom ou une signification" : kind === "hadith" ? "Rechercher un hadith" : "Rechercher une invocation"}
                placeholderTextColor={colors.muted}
                returnKeyType="search"
                style={[styles.searchInput, { color: colors.text }]}
              />
              {query.length > 0 ? <Pressable accessibilityRole="button" accessibilityLabel="Effacer la recherche" onPress={() => { setQuery(""); setSelectedCategory(null); setSelectedItem(null); void loadMain(""); }}><Ionicons name="close-circle" size={19} color={colors.muted} /></Pressable> : null}
              <Pressable accessibilityRole="button" accessibilityLabel="Lancer la recherche" onPress={() => void loadMain(query)} style={{ padding: 3 }}><Ionicons name="arrow-forward-circle" size={25} color={colors.primary} /></Pressable>
            </View>
          ) : null}
          {selectedCategory || selectedCollection ? (
            <Pressable accessibilityRole="button" onPress={() => {
              setSelectedCategory(null);
              setSelectedCollection(null);
              setSelectedItem(null);
              setQuery("");
              void loadMain("");
            }} style={{ flexDirection: "row", alignItems: "center", gap: 7, alignSelf: "flex-start", paddingVertical: 5 }}>
              <Ionicons name="arrow-back" size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 12 }}>Toutes les {kind === "duas" ? "catégories" : "collections"}</Text>
            </Pressable>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.feedback}><ActivityIndicator size="large" color={colors.primary} /><Text style={{ color: colors.muted }}>Préparation de tes ressources…</Text></View>
        ) : error ? (
          <View style={[styles.errorCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="cloud-offline-outline" size={30} color={colors.primary} />
            <Text style={[styles.errorTitle, { color: colors.text }]}>Impossible de charger les données</Text>
            <Text style={[styles.errorText, { color: colors.muted }]}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={() => void loadMain(query)} style={[styles.searchButton, { backgroundColor: colors.primary }]}><Text style={{ color: colors.primaryText, fontWeight: "800" }}>Réessayer</Text></Pressable>
          </View>
        ) : showCategories ? (
          <View style={{ gap: 13 }}>
            <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
              <Text style={{ color: colors.text, fontSize: 19, fontWeight: "800" }}>Catégories</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>{categories.length} thèmes</Text>
            </View>
            {categories.length ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 11 }}>
                {categories.map((raw, index) => {
                  const item = typeof raw === "string" ? { name: raw, slug: raw } : raw && typeof raw === "object" ? raw as RecordValue : { name: String(raw) };
                  const label = labelFor(item, index);
                  const slug = slugFor(item, index);
                  const description = getText(item, ["description", "subtitle", "count", "total"]);
                  const icon = categoryIconFor(label, slug, index);
                  return (
                    <Pressable key={slug + index} accessibilityRole="button" onPress={() => void loadCategory({ label, slug })} style={({ pressed }) => ({ width: "48%", flexGrow: 1, minHeight: 135, padding: 15, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: 12, opacity: pressed ? 0.78 : 1 })}>
                      <View style={{ width: 43, height: 43, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceAlt }}>
                        <Ionicons name={icon} size={22} color={colors.primary} />
                      </View>
                      <View style={{ gap: 4 }}>
                        <Text style={{ color: colors.text, fontWeight: "800", fontSize: 14 }}>{label}</Text>
                        {description ? <Text numberOfLines={2} style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>{description}</Text> : <Text style={{ color: colors.primary, fontSize: 11, fontWeight: "700" }}>Explorer les invocations</Text>}
                      </View>
                      <Ionicons name="arrow-forward" size={17} color={colors.primary} style={{ position: "absolute", right: 13, top: 15 }} />
                    </Pressable>
                  );
                })}
              </View>
            ) : <Text style={{ color: colors.muted }}>Aucune catégorie n’est renvoyée par l’API pour le moment.</Text>}
          </View>
        ) : showCollections ? (
          <View style={{ gap: 13 }}>
            <Text style={{ color: colors.text, fontSize: 19, fontWeight: "800" }}>Recueils de hadiths</Text>
            {collections.length ? (
              <View style={{ gap: 10 }}>
                {collections.map((item, index) => {
                  const label = getTitle(item, index);
                  const slug = getText(item, ["slug", "key", "collection", "name", "title", "id"]);
                  const description = getText(item, ["description", "author", "compiler", "hadithCount", "count"]);
                  return (
                    <Pressable key={slug || index} accessibilityRole="button" onPress={() => chooseCollection(item, index)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 13, padding: 16, borderRadius: 19, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.78 : 1 })}>
                      <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}><Ionicons name="book-outline" size={23} color={colors.primary} /></View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={{ color: colors.text, fontSize: 15, fontWeight: "800" }}>{label}</Text>
                        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>{description || "Ouvrir le recueil et parcourir les hadiths."}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={19} color={colors.primary} />
                    </Pressable>
                  );
                })}
              </View>
            ) : <Text style={{ color: colors.muted }}>Aucun recueil n’est renvoyé par l’API.</Text>}
          </View>
        ) : selectedItem ? (
          <DetailCard item={selectedItem} kind={kind} category={kind === "duas" ? selectedCategory?.label : undefined} onClose={() => setSelectedItem(null)} onPrevious={selectedIndex > 0 ? () => setSelectedItem(records[selectedIndex - 1]) : undefined} onNext={selectedIndex >= 0 && selectedIndex < records.length - 1 ? () => setSelectedItem(records[selectedIndex + 1]) : undefined} />
        ) : kind === "generic" && data !== null ? (
          <View style={{ gap: 12 }}>
            <Text style={{ color: colors.text, fontSize: 19, fontWeight: "800" }}>Informations</Text>
            <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 20, padding: 17 }}>
              <ResourceValue value={data} />
            </View>
          </View>
        ) : records.length ? (
          <View style={{ gap: 13 }}>
            <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
              <Text style={{ color: colors.text, fontSize: 19, fontWeight: "800" }}>{kind === "names" ? "Les beaux noms" : kind === "hadith" ? "Les enseignements" : selectedCategory ? selectedCategory.label : "Résultats"}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>{records.length} résultat{records.length > 1 ? "s" : ""}</Text>
            </View>
            {kind === "names" ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {records.map((item, index) => {
                  const nameCard = buildName(item, index);
                  return (
                  <Pressable key={getId(item, index)} accessibilityRole="button" onPress={() => setSelectedItem(item)} style={({ pressed }) => ({ width: "31%", flexGrow: 1, minHeight: 125, alignItems: "center", justifyContent: "center", padding: 10, gap: 8, borderRadius: 19, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.75 : 1 })}>
                    <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "800" }}>{nameCard.number || String(index + 1).padStart(2, "0")}</Text>
                    <Text numberOfLines={1} style={{ color: colors.text, fontSize: 25, lineHeight: 37, writingDirection: "rtl" }}>{nameCard.arabic || nameCard.title}</Text>
                    {nameCard.latin ? <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 11 }}>{nameCard.latin}</Text> : null}
                    <Text numberOfLines={2} style={{ color: colors.primary, textAlign: "center", fontSize: 11, fontWeight: "800" }}>{nameCard.meaning || nameCard.title}</Text>
                    <Ionicons name="arrow-forward-circle-outline" size={17} color={colors.muted} />
                  </Pressable>
                  );
                })}
              </View>
            ) : (
              <View style={{ gap: 11 }}>
                {records.map((item, index) => {
                  const hadith = kind === "hadith" ? buildHadith(item) : null;
                  const title = hadith ? hadith.title : getTitle(item, index);
                  const arabic = hadith ? hadith.arabic : getArabic(item);
                  const meaning = hadith ? hadith.meaning : getMeaning(item);
                  const reference = hadith
                    ? [hadith.narrator ? `Rapporté par ${hadith.narrator}` : "", hadith.grade].filter(Boolean).join(" · ")
                    : getText(item, ["reference", "source", "book", "hadithNumber", "number", "grade", "authenticity"]);
                  return (
                    <Pressable key={getId(item, index)} accessibilityRole="button" onPress={() => setSelectedItem(item)} style={({ pressed }) => ({ padding: 17, borderRadius: 21, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: 12, opacity: pressed ? 0.8 : 1 })}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
                        <View style={{ width: 35, height: 35, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceAlt }}><Ionicons name={kind === "hadith" ? "book-outline" : "heart-outline"} size={18} color={colors.primary} /></View>
                        <Text numberOfLines={2} style={{ color: colors.text, fontSize: 15, fontWeight: "800", flex: 1 }}>{title}</Text>
                        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                      </View>
                      {arabic ? <Text numberOfLines={3} style={{ color: colors.text, fontSize: 22, lineHeight: 39, textAlign: "right", writingDirection: "rtl" }}>{arabic}</Text> : null}
                      {meaning ? <Text numberOfLines={kind === "hadith" ? 4 : 3} style={{ color: colors.muted, fontSize: 13, lineHeight: 21 }}>{meaning}</Text> : null}
                      {reference ? <Text numberOfLines={1} style={{ color: colors.primary, fontSize: 11, fontWeight: "700" }}>{reference}</Text> : null}
                      <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "800" }}>Lire et approfondir →</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        ) : loaded ? (
          <View style={styles.feedback}>
            <Ionicons name="book-outline" size={28} color={colors.muted} />
            <Text style={{ color: colors.text, fontWeight: "800" }}>Aucun résultat</Text>
            <Text style={{ color: colors.muted, textAlign: "center", lineHeight: 21 }}>Essaie une autre recherche ou actualise les données.</Text>
          </View>
        ) : null}
        {kind === "generic" && data !== null && !records.length ? <ResourceValue value={data} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}
