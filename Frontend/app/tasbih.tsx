import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, Text, TextInput, Vibration, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import BackButton from "../components/BackButton";
import { useAppTheme } from "../src/theme/ThemeProvider";
import { readDuaFavorites, type DuaFavorite } from "../src/lib/duaFavorites";

const STORAGE_KEY = "muslimapp:tasbih:v1";

type Dhikr = {
  id: string;
  label: string;
  arabic: string;
  meaning: string;
  target: number | null;
  custom?: boolean;
  favorite?: boolean;
  counterOnly?: boolean;
};

const DEFAULT_DHIKRS: Dhikr[] = [
  { id: "subhanallah", arabic: "سُبْحَانَ ٱللَّٰهِ", label: "SubhanAllah", meaning: "Gloire à Allah", target: 33 },
  { id: "alhamdulillah", arabic: "ٱلْحَمْدُ لِلَّٰهِ", label: "Alhamdulillah", meaning: "Louange à Allah", target: 33 },
  { id: "allahu-akbar", arabic: "ٱللَّٰهُ أَكْبَرُ", label: "Allahu Akbar", meaning: "Allah est le Plus Grand", target: 34 },
  { id: "la-ilaha", arabic: "لَا إِلَٰهَ إِلَّا ٱللَّٰهُ", label: "La ilaha illa Allah", meaning: "Il n’y a de divinité qu’Allah", target: 100 },
  { id: "istighfar", arabic: "أَسْتَغْفِرُ ٱللَّٰهَ", label: "Astaghfirullah", meaning: "Je demande pardon à Allah", target: 100 },
  { id: "salawat", arabic: "ٱللَّٰهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ", label: "Salawat", meaning: "Prière sur le Prophète ﷺ", target: 100 },
];

const COUNTER_ONLY: Dhikr = {
  id: "counter-only",
  label: "Compteur seul",
  arabic: "",
  meaning: "Compte librement, sans invocation ni objectif prédéfini.",
  target: null,
  counterOnly: true,
};

type TasbihState = {
  selected: string;
  customDhikrs: Dhikr[];
  counts: Record<string, number>;
  laps: Record<string, number>;
  day: string;
  today: number;
};

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function emptyState(): TasbihState {
  return { selected: "", customDhikrs: [], counts: {}, laps: {}, day: todayKey(), today: 0 };
}

function sanitize(raw: unknown): TasbihState {
  const base = emptyState();
  if (!raw || typeof raw !== "object") return base;
  const value = raw as Partial<TasbihState> & { selected?: string | number };
  const num = (n: unknown) => (typeof n === "number" && Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0);
  const customDhikrs: Dhikr[] = Array.isArray(value.customDhikrs)
    ? value.customDhikrs
        .filter((item): item is Dhikr => Boolean(item && typeof item === "object" && typeof item.id === "string" && typeof item.label === "string" && item.custom === true))
        .map((item) => ({
          id: item.id,
          label: item.label.slice(0, 60),
          arabic: typeof item.arabic === "string" ? item.arabic.slice(0, 240) : "",
          meaning: typeof item.meaning === "string" ? item.meaning.slice(0, 160) : "",
          target: typeof item.target === "number" && Number.isFinite(item.target) && item.target > 0 ? Math.floor(item.target) : null,
          custom: true,
        }))
        .slice(0, 100)
    : [];
  const validIds = new Set(["", ...DEFAULT_DHIKRS.map((item) => item.id), ...customDhikrs.map((item) => item.id), COUNTER_ONLY.id]);
  const cleanMap = (map: unknown) => {
    const out: Record<string, number> = {};
    if (map && typeof map === "object") {
      for (const [id, count] of Object.entries(map as Record<string, unknown>)) {
        if (validIds.has(id) || id.startsWith("dua:")) out[id] = num(count);
      }
    }
    return out;
  };
  const sameDay = value.day === base.day;
  const selected = typeof value.selected === "number"
    ? DEFAULT_DHIKRS[Math.min(DEFAULT_DHIKRS.length - 1, num(value.selected))]?.id ?? base.selected
    : typeof value.selected === "string" && (validIds.has(value.selected) || value.selected.startsWith("dua:"))
      ? value.selected
      : base.selected;
  return {
    selected,
    customDhikrs,
    counts: cleanMap(value.counts),
    laps: cleanMap(value.laps),
    day: base.day,
    today: sameDay ? num(value.today) : 0,
  };
}

export default function TasbihScreen() {
  const { colors } = useAppTheme();
  const [state, setState] = useState<TasbihState>(emptyState);
  const [ready, setReady] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [duaFavorites, setDuaFavorites] = useState<DuaFavorite[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [newArabic, setNewArabic] = useState("");
  const [newMeaning, setNewMeaning] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => (raw ? sanitize(JSON.parse(raw)) : emptyState()))
      .catch(() => emptyState())
      .then((loaded) => {
        if (!active) return;
        setState(loaded);
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state, ready]);

  useFocusEffect(useCallback(() => {
    if (!ready) return;
    let active = true;
    void readDuaFavorites().then((favorites) => {
      if (!active) return;
      setDuaFavorites(favorites);
      setState((current) => {
        const hasSelectedFavorite = favorites.some((favorite) => "dua:" + favorite.id === current.selected);
        const legacySelection = DEFAULT_DHIKRS.some((item) => item.id === current.selected);
        const selectedWasRemoved = current.selected.startsWith("dua:") && !hasSelectedFavorite;
        if (hasSelectedFavorite || (current.selected && !legacySelection && !selectedWasRemoved)) return current;
        if (favorites.length) return { ...current, selected: "dua:" + favorites[0].id };
        return { ...current, selected: "" };
      });
    });
    return () => {
      active = false;
    };
  }, [ready]));

  const favoriteDhikrs = useMemo<Dhikr[]>(() => duaFavorites.map((favorite) => ({
    id: "dua:" + favorite.id,
    label: favorite.title,
    arabic: favorite.arabic,
    meaning: favorite.meaning || favorite.category || "Invocation favorite",
    target: favorite.target,
    favorite: true,
  })), [duaFavorites]);
  const items = useMemo(() => [...favoriteDhikrs, ...state.customDhikrs, COUNTER_ONLY], [favoriteDhikrs, state.customDhikrs]);
  const dhikr = items.find((item) => item.id === state.selected) ?? favoriteDhikrs[0] ?? COUNTER_ONLY;
  const count = state.counts[dhikr.id] ?? 0;
  const laps = state.laps[dhikr.id] ?? 0;
  const progress = dhikr.target ? Math.min(1, count / dhikr.target) : 0;

  const increment = useCallback(() => {
    const current = stateRef.current;
    const currentFavorites: Dhikr[] = duaFavorites.map((favorite) => ({
      id: "dua:" + favorite.id, label: favorite.title, arabic: favorite.arabic,
      meaning: favorite.meaning || favorite.category || "Invocation favorite", target: favorite.target, favorite: true,
    }));
    const currentItems = [...currentFavorites, ...current.customDhikrs, COUNTER_ONLY, ...DEFAULT_DHIKRS];
    const item = currentItems.find((entry) => entry.id === current.selected) ?? currentFavorites[0] ?? COUNTER_ONLY;
    const next = (current.counts[item.id] ?? 0) + 1;
    const completed = item.target !== null && next >= item.target;
    if (Platform.OS !== "web") Vibration.vibrate(completed ? [0, 60, 60, 60] : 12);
    setState({
      ...current,
      day: todayKey(),
      today: (current.day === todayKey() ? current.today : 0) + 1,
      counts: { ...current.counts, [item.id]: completed ? 0 : next },
      laps: completed ? { ...current.laps, [item.id]: (current.laps[item.id] ?? 0) + 1 } : current.laps,
    });
  }, [duaFavorites]);

  const resetCurrent = useCallback(() => {
    const doReset = () =>
      setState((current) => ({
        ...current,
        counts: { ...current.counts, [current.selected]: 0 },
        laps: { ...current.laps, [current.selected]: 0 },
      }));
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm("Remettre ce compteur à zéro ?")) doReset();
      return;
    }
    Alert.alert("Remettre à zéro ?", "Le compteur et les cycles de cette invocation seront réinitialisés.", [
      { text: "Annuler", style: "cancel" },
      { text: "Réinitialiser", style: "destructive", onPress: doReset },
    ]);
  }, []);

  const addFavorite = useCallback(() => {
    const label = newLabel.trim();
    const parsedTarget = newTarget.trim() ? Number.parseInt(newTarget.trim(), 10) : null;
    if (!label && !newTarget.trim()) {
      const message = "Donne un nom à ton invocation ou indique un objectif de répétitions.";
      if (Platform.OS === "web") {
        if (typeof window !== "undefined") window.alert(message);
      } else {
        Alert.alert("Informations manquantes", message);
      }
      return;
    }
    if (newTarget.trim() && (!Number.isFinite(parsedTarget) || (parsedTarget ?? 0) < 1)) {
      if (Platform.OS === "web") {
        if (typeof window !== "undefined") window.alert("L’objectif doit être un nombre entier supérieur à zéro, ou rester vide.");
      } else {
        Alert.alert("Objectif invalide", "L’objectif doit être un nombre entier supérieur à zéro, ou rester vide.");
      }
      return;
    }
    const favorite: Dhikr = {
      id: `custom-${Date.now()}`,
      label: label || `Autre · ${parsedTarget}`,
      arabic: newArabic.trim(),
      meaning: newMeaning.trim(),
      target: parsedTarget,
      custom: true,
    };
    setState((current) => ({
      ...current,
      selected: favorite.id,
      customDhikrs: [...current.customDhikrs, favorite],
    }));
    setNewLabel("");
    setNewArabic("");
    setNewMeaning("");
    setNewTarget("");
    setShowAddForm(false);
  }, [newArabic, newLabel, newMeaning, newTarget]);

  const deleteFavorite = useCallback((id: string) => {
    const remove = () => setState((current) => ({
      ...current,
      selected: current.selected === id ? (duaFavorites[0] ? "dua:" + duaFavorites[0].id : "") : current.selected,
      customDhikrs: current.customDhikrs.filter((item) => item.id !== id),
      counts: Object.fromEntries(Object.entries(current.counts).filter(([key]) => key !== id)),
      laps: Object.fromEntries(Object.entries(current.laps).filter(([key]) => key !== id)),
    }));
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm("Supprimer cette invocation favorite et son compteur ?")) remove();
      return;
    }
    Alert.alert("Supprimer le favori ?", "Cette invocation et son compteur seront supprimés.", [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: remove },
    ]);
  }, [duaFavorites]);

  const inputStyle = {
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 14,
  } as const;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 36, gap: 18, maxWidth: 900, width: "100%", alignSelf: "center" }}>
        <BackButton />
        <View style={{ gap: 6 }}>
          <Text style={{ color: colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1.8 }}>DHIKR</Text>
          <Text style={{ color: colors.text, fontSize: 30, fontWeight: "800" }}>Tasbih</Text>
          <Text style={{ color: colors.muted, lineHeight: 21 }}>
            Retrouve ici les invocations que tu as enregistrées avec le cœur dans Adhkar. Chaque compteur et ta progression sont conservés sur cet appareil.
          </Text>
        </View>

        <View style={{ gap: 9 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: "800" }}>Mes invocations favorites</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowAdvanced((visible) => !visible)}
              style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}
            >
              <Ionicons name={showAdvanced ? "chevron-up" : "ellipsis-horizontal"} size={16} color={colors.muted} />
              <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "700" }}>{showAdvanced ? "Masquer les options" : "Options"}</Text>
            </Pressable>
          </View>

          {favoriteDhikrs.length ? (
            <View accessibilityRole="radiogroup" style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {favoriteDhikrs.map((item) => {
              const selected = item.id === state.selected;
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setState((current) => ({ ...current, selected: item.id }))}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingVertical: 9,
                    paddingHorizontal: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected ? colors.primary : colors.surfaceAlt,
                  }}
                >
                  <Text style={{ color: selected ? colors.primaryText : colors.text, fontSize: 12, fontWeight: "700" }}>{item.label}</Text>
                  <Ionicons name="heart" size={12} color={selected ? colors.primaryText : colors.primary} />
                </Pressable>
              );
            })}
            </View>
          ) : (
            <View style={{ borderRadius: 16, padding: 16, gap: 6, backgroundColor: colors.surfaceAlt }}>
              <Ionicons name="heart-outline" size={22} color={colors.primary} />
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: "800" }}>Aucun favori pour le moment</Text>
              <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>Ouvre « Invocations & adhkar », puis appuie sur « Ajouter aux favoris » dans le détail d’une invocation. Elle apparaîtra ici automatiquement.</Text>
            </View>
          )}

          {showAdvanced ? (
            <View style={{ borderRadius: 16, padding: 14, gap: 11, backgroundColor: colors.surfaceAlt }}>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: "800" }}>Options secondaires</Text>
              <Pressable accessibilityRole="button" onPress={() => setState((current) => ({ ...current, selected: COUNTER_ONLY.id }))} style={{ alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 9, borderRadius: 11, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ color: colors.text, fontSize: 12, fontWeight: "700" }}>Utiliser le compteur libre</Text>
              </Pressable>
              {state.customDhikrs.length ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {state.customDhikrs.map((item) => (
                    <Pressable key={item.id} accessibilityRole="button" onPress={() => setState((current) => ({ ...current, selected: item.id }))} style={{ paddingHorizontal: 11, paddingVertical: 8, borderRadius: 11, borderWidth: 1, borderColor: state.selected === item.id ? colors.primary : colors.border }}>
                      <Text style={{ color: colors.text, fontSize: 12, fontWeight: "700" }}>{item.label}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <Pressable accessibilityRole="button" onPress={() => setShowAddForm((visible) => !visible)} style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 7 }}>
                <Ionicons name={showAddForm ? "close" : "add-circle-outline"} size={17} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "800" }}>{showAddForm ? "Fermer la création" : "Créer une invocation personnalisée"}</Text>
              </Pressable>
            </View>
          ) : null}

          {showAddForm && showAdvanced ? (
            <View style={{ padding: 16, gap: 11, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}>Créer une invocation personnalisée</Text>
              <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>Crée autant de compteurs que tu veux. Pour un objectif personnalisé, saisis simplement le nombre de répétitions : le compteur sera enregistré sous « Autre · nombre ». Tu peux aussi donner un nom et laisser l’objectif vide pour compter librement.</Text>
              <TextInput value={newLabel} onChangeText={setNewLabel} placeholder="Nom (facultatif si objectif rempli)" placeholderTextColor={colors.muted} maxLength={60} style={inputStyle} returnKeyType="next" />
              <TextInput value={newArabic} onChangeText={setNewArabic} placeholder="Texte arabe (facultatif)" placeholderTextColor={colors.muted} maxLength={240} style={[inputStyle, { textAlign: "right", fontSize: 20 }]} />
              <TextInput value={newMeaning} onChangeText={setNewMeaning} placeholder="Traduction ou note (facultatif)" placeholderTextColor={colors.muted} maxLength={160} style={inputStyle} />
              <TextInput value={newTarget} onChangeText={setNewTarget} placeholder="Objectif (ex. 33) — vide = compteur libre" placeholderTextColor={colors.muted} keyboardType="number-pad" maxLength={7} style={inputStyle} />
              <Pressable accessibilityRole="button" onPress={addFavorite} style={{ alignItems: "center", justifyContent: "center", paddingVertical: 13, borderRadius: 12, backgroundColor: colors.primary }}>
                <Text style={{ color: colors.primaryText, fontWeight: "800" }}>Enregistrer l’invocation</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {favoriteDhikrs.length > 0 || showAdvanced ? (
        <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 24, padding: 22, alignItems: "center", gap: 14 }}>
          {dhikr.arabic ? <Text style={{ color: colors.text, fontSize: 30, lineHeight: 52, textAlign: "center" }}>{dhikr.arabic}</Text> : null}
          <Text style={{ color: colors.muted, fontSize: 13, textAlign: "center" }}>{dhikr.meaning || (dhikr.counterOnly ? "Compteur libre" : "Invocation favorite")}</Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={dhikr.target ? `Compter ${dhikr.label}. ${count} sur ${dhikr.target}` : `Incrémenter le compteur. ${count}`}
            onPress={increment}
            style={({ pressed }) => ({
              width: 210,
              height: 210,
              borderRadius: 105,
              borderWidth: 8,
              borderColor: dhikr.target && count >= dhikr.target ? colors.success : colors.primary,
              backgroundColor: colors.surfaceAlt,
              alignItems: "center",
              justifyContent: "center",
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <Text style={{ color: colors.text, fontSize: 60, fontWeight: "900", fontVariant: ["tabular-nums"] }}>{count}</Text>
            <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "700" }}>{dhikr.target ? `sur ${dhikr.target}` : "appuie pour compter"}</Text>
          </Pressable>

          {dhikr.target ? (
            <View style={{ width: "100%", height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: "hidden" }}>
              <View style={{ width: `${Math.round(progress * 100)}%`, height: 8, backgroundColor: colors.primary }} />
            </View>
          ) : null}

          <View style={{ flexDirection: "row", gap: 24 }}>
            {dhikr.target ? (
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: colors.text, fontSize: 20, fontWeight: "800" }}>{laps}</Text>
                <Text style={{ color: colors.muted, fontSize: 11 }}>cycles terminés</Text>
              </View>
            ) : null}
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: "800" }}>{state.today}</Text>
              <Text style={{ color: colors.muted, fontSize: 11 }}>aujourd’hui</Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 10 }}>
            <Pressable
              accessibilityRole="button"
              onPress={resetCurrent}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingVertical: 11,
                paddingHorizontal: 18,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.border,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Ionicons name="refresh-outline" size={18} color={colors.text} />
              <Text style={{ color: colors.text, fontWeight: "700" }}>Remettre à zéro</Text>
            </Pressable>
            {dhikr.custom ? (
              <Pressable accessibilityRole="button" onPress={() => deleteFavorite(dhikr.id)} style={{ flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 11, paddingHorizontal: 15, borderRadius: 14, borderWidth: 1, borderColor: colors.danger ?? colors.border }}>
                <Ionicons name="trash-outline" size={17} color={colors.danger ?? colors.text} />
                <Text style={{ color: colors.danger ?? colors.text, fontWeight: "700" }}>Supprimer l’invocation</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
