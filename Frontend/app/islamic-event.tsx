import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Linking, ScrollView, Text, View, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BackButton from "../components/BackButton";
import { useAppTheme } from "../src/theme/ThemeProvider";


type EncyclopediaSummary = {
  title: string;
  extract: string;
  pageUrl: string;
};

function wikipediaArticleForEvent(title: string): string {
  const value = title.toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (value.includes("ramadan")) return "Ramadan";
  if (value.includes("fitr")) return "Aïd el-Fitr";
  if (value.includes("adha") || value.includes("ad-ha") || value.includes("sacrifice")) return "Aïd el-Adha";
  if (value.includes("ashura") || value.includes("achoura")) return "Achoura";
  if (value.includes("mawlid") || value.includes("naissance du prophete") || value.includes("prophète")) return "Mawlid";
  if (value.includes("laylat") || value.includes("nuit du destin") || value.includes("qadr")) return "Laylat al-Qadr";
  if (value.includes("arafa") || value.includes("arafat")) return "Jour d'Arafat";
  if (value.includes("hijri") || value.includes("nouvel an") || value.includes("mouharram") || value.includes("muharram")) return "Nouvel an musulman";
  return title.trim();
}

type EventProfile = {
  subtitle: string;
  meaning: string;
  significance: string;
  practices: string[];
  notes: string[];
  icon: keyof typeof Ionicons.glyphMap;
};

function profileForEvent(title: string): EventProfile {
  const value = title.toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (value.includes("ramadan")) return {
    subtitle: "Un mois de jeûne, de prière et de renouveau spirituel",
    meaning: "Le Ramadan est le neuvième mois du calendrier hégirien. Les musulmans qui en ont l’obligation jeûnent de l’aube au coucher du soleil, tout en accordant une place particulière au Coran, à la prière et à la générosité.",
    significance: "Le jeûne est l’un des cinq piliers de l’islam. Le mois rappelle la révélation du Coran et invite à développer la piété, la patience, la gratitude et l’attention portée aux personnes dans le besoin.",
    practices: ["Observer le jeûne lorsque l’on en est religieusement responsable et apte à le faire.", "Préserver les prières obligatoires et consacrer du temps à la lecture du Coran.", "Multiplier les actes de charité, l’entraide et les bonnes actions.", "Prendre le repas avant l’aube (sahour) et rompre le jeûne au coucher du soleil (iftar)."],
    notes: ["Des exemptions existent notamment en cas de maladie, de voyage et dans d’autres situations prévues par le droit musulman.", "Le début du mois peut varier selon la méthode de détermination retenue par les communautés."],
    icon: "moon"
  };
  if (value.includes("eid al-fitr") || value.includes("aid al-fitr") || value.includes("fitr")) return {
    subtitle: "La fête qui marque la fin du Ramadan",
    meaning: "Aïd al-Fitr est célébré au début du mois de Chawwal, après le mois de Ramadan. C’est un moment de gratitude, de rassemblement et de joie partagée.",
    significance: "La fête conclut le mois de jeûne. Elle rappelle l’importance de remercier Allah, de renforcer les liens familiaux et de veiller à ce que les personnes dans le besoin puissent aussi participer à la célébration.",
    practices: ["S’acquitter de la zakat al-fitr dans les délais suivis par sa communauté.", "Participer à la prière de l’Aïd lorsqu’elle est organisée et que l’on peut s’y rendre.", "Prendre soin de ses proches, partager un repas et échanger des salutations.", "Exprimer sa gratitude et maintenir de bonnes actions après le Ramadan."],
    notes: ["La date dépend du début de Chawwal et peut varier selon l’observation lunaire ou le calendrier adopté localement.", "Les modalités pratiques de la zakat al-fitr peuvent différer selon les avis et organismes reconnus."],
    icon: "people"
  };
  if (value.includes("adha") || value.includes("ad-ha") || value.includes("sacrifice")) return {
    subtitle: "Une fête de foi, de partage et de solidarité",
    meaning: "Aïd al-Adha a lieu le 10 Dhou al-Hijja, pendant la période du pèlerinage. Elle est associée au récit d’Ibrahim et à sa soumission à Allah.",
    significance: "Cette fête met en avant la foi, l’obéissance et le partage. Le sacrifice rituel, lorsqu’il est accompli, s’accompagne d’une attention particulière à la famille et aux personnes dans le besoin.",
    practices: ["Participer à la prière de l’Aïd selon les possibilités locales.", "Se rappeler le sens spirituel du récit d’Ibrahim.", "Partager avec la famille, les voisins et les personnes en difficulté.", "Pour les personnes qui accomplissent le sacrifice, suivre les règles et recommandations de leur communauté."],
    notes: ["La fête se situe pendant les jours du Hajj, mais sa date grégorienne varie d’une année à l’autre.", "Les règles relatives au sacrifice et à son organisation peuvent varier selon les écoles et les autorités locales."],
    icon: "heart"
  };
  if (value.includes("hijri") || value.includes("nouvel an") || value.includes("mouharram") || value.includes("muharram")) return {
    subtitle: "Le commencement d’une nouvelle année hégirienne",
    meaning: "Le calendrier hégirien est lunaire. Son année commence avec le mois de Mouharram et compte douze mois déterminés par les cycles lunaires.",
    significance: "Le calendrier rappelle l’Hégire, la migration du Prophète Muhammad de La Mecque vers Médine, événement qui sert de point de départ au décompte des années hégiriennes.",
    practices: ["Prendre un moment pour faire le bilan de ses habitudes et de ses objectifs spirituels.", "Apprendre l’histoire de l’Hégire et ses enseignements.", "Poursuivre les bonnes actions et les relations bienveillantes toute l’année."],
    notes: ["Il n’existe pas de rituel universellement établi pour célébrer le nouvel an hégirien.", "Le premier jour peut différer selon l’observation lunaire et les calendriers locaux."],
    icon: "calendar"
  };
  if (value.includes("ashura") || value.includes("achoura")) return {
    subtitle: "Le dixième jour de Mouharram",
    meaning: "Achoura correspond au 10 Mouharram. Dans la tradition musulmane, cette journée est notamment associée au jeûne rapporté dans les enseignements prophétiques.",
    significance: "Des récits rapportent le jeûne du jour d’Achoura. De nombreux musulmans choisissent également de jeûner le jour qui le précède ou le suit, selon les enseignements qu’ils suivent.",
    practices: ["Pour les personnes qui le souhaitent et le peuvent, envisager le jeûne surérogatoire.", "Se renseigner auprès d’une source religieuse fiable pour connaître les pratiques et leurs fondements.", "Garder à l’esprit que les pratiques et commémorations peuvent différer entre communautés."],
    notes: ["Le jeûne d’Achoura est surérogatoire, et non un remplacement du jeûne obligatoire de Ramadan.", "La date grégorienne est approximative tant que le mois lunaire n’est pas confirmé localement."],
    icon: "water"
  };
  if (value.includes("mawlid") || value.includes("naissance du prophete") || value.includes("prophète")) return {
    subtitle: "Un repère lié à la vie du Prophète Muhammad",
    meaning: "Certaines communautés marquent cette date en lien avec la naissance du Prophète Muhammad. Les manières de la commémorer et les avis religieux à son sujet diffèrent.",
    significance: "L’étude de la vie du Prophète, de son caractère et de son enseignement constitue pour les musulmans un moyen d’approfondir leur compréhension de la tradition islamique.",
    practices: ["Lire des éléments fiables de la biographie prophétique (sîra).", "Étudier les enseignements et le caractère du Prophète.", "Multiplier les actes de bonté et de solidarité, sans considérer une pratique particulière comme universelle."],
    notes: ["Cette commémoration n’est pas observée de la même manière par tous les musulmans.", "La date exacte et le statut de cette célébration font l’objet de différences d’approche."],
    icon: "book"
  };
  if (value.includes("laylat") || value.includes("nuit du destin") || value.includes("qadr")) return {
    subtitle: "Une nuit recherchée durant les dernières nuits de Ramadan",
    meaning: "Laylat al-Qadr, souvent traduite par « la Nuit du Destin », est mentionnée dans le Coran comme une nuit d’une grande valeur spirituelle.",
    significance: "La sourate Al-Qadr évoque cette nuit comme meilleure que mille mois. Les enseignements recommandent de la rechercher parmi les nuits impaires des dix dernières nuits de Ramadan.",
    practices: ["Renforcer la prière et l’invocation selon ses capacités.", "Lire ou écouter le Coran et prendre un temps de réflexion.", "Multiplier les demandes de pardon et les invocations sincères."],
    notes: ["La date précise n’est pas connue avec certitude; il est recommandé de rechercher cette nuit durant les dix dernières nuits.", "Les horaires et les pratiques recommandées peuvent être expliqués par un enseignant religieux de confiance."],
    icon: "moon"
  };
  if (value.includes("arafa") || value.includes("arafat")) return {
    subtitle: "Le neuvième jour de Dhou al-Hijja",
    meaning: "Le jour d’Arafat se déroule le 9 Dhou al-Hijja et occupe une place centrale dans le pèlerinage du Hajj.",
    significance: "Les pèlerins se rassemblent à Arafat, étape essentielle du Hajj. Pour les personnes qui ne font pas le pèlerinage, le jeûne de ce jour est traditionnellement recommandé, sous réserve de leur situation.",
    practices: ["Pour les personnes qui ne sont pas en pèlerinage et qui le peuvent, envisager le jeûne recommandé.", "Consacrer du temps à l’invocation, au repentir et à la réflexion.", "Respecter les consignes officielles et la sécurité si l’on participe au Hajj."],
    notes: ["Les pèlerins suivent les rites et horaires encadrés par les autorités du Hajj.", "La date grégorienne dépend du calendrier lunaire et des décisions locales."],
    icon: "sunny"
  };
  return {
    subtitle: "Comprendre ce repère du calendrier islamique",
    meaning: "Cet événement fait partie des repères du calendrier musulman. Sa date peut être exprimée dans le calendrier hégirien lunaire et correspondre à une date grégorienne différente chaque année.",
    significance: "Les dates et les commémorations peuvent rappeler des moments importants de l’histoire islamique, des occasions d’adoration ou des temps de rassemblement. Leur signification précise dépend de l’événement concerné et des sources suivies.",
    practices: ["Consulter des sources fiables pour approfondir l’histoire et la signification de cette date.", "Privilégier les actes de bonté, la prière et l’apprentissage selon ses convictions.", "Vérifier les informations auprès de sa mosquée ou de son autorité religieuse locale si la date a une conséquence pratique."],
    notes: ["Les dates hégiriennes peuvent varier selon l’observation du croissant lunaire, le pays et la méthode de calcul.", "Les pratiques religieuses ne sont pas toutes communes à l’ensemble des communautés musulmanes."],
    icon: "star"
  };
}

function InfoSection({ title, icon, children, colors }: { title: string; icon: keyof typeof Ionicons.glyphMap; children: ReactNode; colors: ReturnType<typeof useAppTheme>["colors"] }) {
  return (
    <View style={{ padding: 17, gap: 12, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
        <View style={{ width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceAlt }}>
          <Ionicons name={icon} size={18} color={colors.primary} />
        </View>
        <Text style={{ flex: 1, color: colors.text, fontSize: 16, fontWeight: "900" }}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export default function IslamicEventScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string; title?: string; dateLabel?: string; gregorianDate?: string;
    hijriDay?: string; hijriMonth?: string; description?: string;
  }>();
  const { colors } = useAppTheme();
  const title = typeof params.title === "string" && params.title.trim() ? params.title : "Événement islamique";
  const dateLabel = typeof params.dateLabel === "string" ? params.dateLabel : "Date à confirmer";
  const description = typeof params.description === "string" ? params.description : "";
  const profile = useMemo(() => profileForEvent(title), [title]);
  const [encyclopedia, setEncyclopedia] = useState<EncyclopediaSummary | null>(null);
  const [encyclopediaLoading, setEncyclopediaLoading] = useState(false);
  const [encyclopediaError, setEncyclopediaError] = useState("");

  useEffect(() => {
    let active = true;
    const articleTitle = wikipediaArticleForEvent(title);
    setEncyclopedia(null);
    setEncyclopediaError("");
    setEncyclopediaLoading(true);

    fetch(`https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(articleTitle)}`, {
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Aucun article encyclopédique disponible pour cet événement.");
        return response.json();
      })
      .then((data: { title?: unknown; extract?: unknown; content_urls?: { desktop?: { page?: unknown } } }) => {
        const extract = typeof data.extract === "string" ? data.extract.trim() : "";
        const pageUrl = typeof data.content_urls?.desktop?.page === "string" ? data.content_urls.desktop.page : "";
        if (!extract || !pageUrl) throw new Error("L’article ne contient pas de résumé exploitable.");
        if (active) setEncyclopedia({
          title: typeof data.title === "string" ? data.title : articleTitle,
          extract,
          pageUrl,
        });
      })
      .catch((error: unknown) => {
        if (active) setEncyclopediaError(error instanceof Error ? error.message : "L’article n’a pas pu être chargé.");
      })
      .finally(() => {
        if (active) setEncyclopediaLoading(false);
      });

    return () => { active = false; };
  }, [title]);
  const gregorianDate = typeof params.gregorianDate === "string" ? params.gregorianDate : "";
  const hijriDay = typeof params.hijriDay === "string" ? params.hijriDay : "";
  const hijriMonth = typeof params.hijriMonth === "string" ? params.hijriMonth : "";
  const dateIsValid = /^\d{4}-\d{2}-\d{2}$/.test(gregorianDate);
  const formattedGregorian = dateIsValid
    ? new Intl.DateTimeFormat("fr-CA", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${gregorianDate}T12:00:00Z`))
    : "";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: 36, gap: 16, width: "100%", maxWidth: 760, alignSelf: "center" }} showsVerticalScrollIndicator={false}>
        <BackButton />
        <View style={{ padding: 22, borderRadius: 26, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 15, overflow: "hidden" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceAlt }}>
              <Ionicons name={profile.icon} size={22} color={colors.primary} />
            </View>
            <Text style={{ color: colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1.5 }}>MUSLIMAPP · REPÈRE ISLAMIQUE</Text>
          </View>
          <Text style={{ color: colors.text, fontSize: 30, lineHeight: 37, fontWeight: "900", letterSpacing: -0.7 }}>{title}</Text>
          <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 23 }}>{profile.subtitle}</Text>
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1, padding: 12, gap: 6, borderRadius: 15, backgroundColor: colors.surfaceAlt }}>
              <Ionicons name="moon-outline" size={17} color={colors.primary} />
              <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "800" }}>DATE HÉGIRIENNE</Text>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: "800" }}>{hijriDay && hijriMonth ? `${hijriDay} · mois ${hijriMonth}` : "Selon le calendrier local"}</Text>
            </View>
            <View style={{ flex: 1, padding: 12, gap: 6, borderRadius: 15, backgroundColor: colors.surfaceAlt }}>
              <Ionicons name="calendar-outline" size={17} color={colors.primary} />
              <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "800" }}>DATE GRÉGORIENNE</Text>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: "800", textTransform: "capitalize" }}>{formattedGregorian || dateLabel}</Text>
            </View>
          </View>
          {dateIsValid ? <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 17 }}>Date indicative : elle peut différer selon le pays et l’observation du croissant lunaire.</Text> : null}
          {description ? <Text style={{ color: colors.text, fontSize: 14, lineHeight: 22 }}>{description}</Text> : null}
        </View>

        <InfoSection title="En bref" icon="information-circle-outline" colors={colors}>
          <Text style={{ color: colors.text, fontSize: 14, lineHeight: 23 }}>{profile.meaning}</Text>
        </InfoSection>
        <InfoSection title="Pourquoi cette date est importante" icon="book-outline" colors={colors}>
          <Text style={{ color: colors.text, fontSize: 14, lineHeight: 23 }}>{profile.significance}</Text>
        </InfoSection>

        <InfoSection title="Approfondir l’histoire" icon="library-outline" colors={colors}>
          {encyclopediaLoading ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={{ color: colors.muted, fontSize: 13 }}>Recherche d’informations complémentaires…</Text>
            </View>
          ) : encyclopedia ? (
            <>
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: "900" }}>Résumé encyclopédique · {encyclopedia.title}</Text>
              <Text style={{ color: colors.text, fontSize: 14, lineHeight: 23 }}>{encyclopedia.extract}</Text>
              <Pressable
                accessibilityRole="link"
                onPress={() => { void Linking.openURL(encyclopedia.pageUrl); }}
                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 7, paddingTop: 4, opacity: pressed ? 0.65 : 1 })}
              >
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "800" }}>Lire la source complète sur Wikipédia</Text>
                <Ionicons name="open-outline" size={15} color={colors.primary} />
              </Pressable>
            </>
          ) : (
            <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 21 }}>
              {encyclopediaError || "Les informations détaillées restent disponibles dans les sections ci-dessus."}
              {" "}Le résumé externe est facultatif : les explications principales de cette page restent visibles sans cette connexion.
            </Text>
          )}
        </InfoSection>

        <InfoSection title="Repères et pratiques" icon="checkmark-circle-outline" colors={colors}>
          {profile.practices.map((item, index) => (
            <View key={item} style={{ flexDirection: "row", alignItems: "flex-start", gap: 9 }}>
              <Ionicons name="checkmark" size={17} color={colors.primary} style={{ marginTop: 2 }} />
              <Text style={{ flex: 1, color: colors.text, fontSize: 13, lineHeight: 21 }}>{item}</Text>
            </View>
          ))}
        </InfoSection>
        <InfoSection title="À savoir" icon="alert-circle-outline" colors={colors}>
          {profile.notes.map((item) => (
            <View key={item} style={{ flexDirection: "row", alignItems: "flex-start", gap: 9 }}>
              <Ionicons name="information-circle-outline" size={17} color={colors.muted} style={{ marginTop: 2 }} />
              <Text style={{ flex: 1, color: colors.muted, fontSize: 13, lineHeight: 21 }}>{item}</Text>
            </View>
          ))}
        </InfoSection>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => ({ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, borderRadius: 16, backgroundColor: colors.primary, paddingVertical: 15, opacity: pressed ? 0.8 : 1 })}>
          <Ionicons name="arrow-back" size={17} color={colors.primaryText} />
          <Text style={{ color: colors.primaryText, fontSize: 14, fontWeight: "900" }}>Retour au calendrier</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
