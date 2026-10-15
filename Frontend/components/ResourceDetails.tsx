import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useAppTheme } from "../theme/ThemeProvider";
import {
  type RecordValue,
  type ResourceKind,
  ResourceValue,
  getText,
  getTitle,
  getArabic,
  getMeaning,
  buildHadith,
  buildName,
} from "./resource.utils";

function Chip({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 14, paddingHorizontal: 11, paddingVertical: 8, backgroundColor: colors.surfaceAlt }}>
      <Ionicons name={icon} size={15} color={colors.primary} />
      <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "800" }}>{label}</Text>
    </View>
  );
}

function InfoBlock({ icon, label, text }: { icon: keyof typeof Ionicons.glyphMap; label: string; text: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
      <Ionicons name={icon} size={18} color={colors.primary} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "900" }}>{label}</Text>
        <Text style={{ color: colors.text, fontSize: 13, lineHeight: 20 }}>{text}</Text>
      </View>
    </View>
  );
}

function ArabicBlock({ text, large }: { text: string; large?: boolean }) {
  const { colors } = useAppTheme();
  if (!text) return null;
  return (
    <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: 20, paddingHorizontal: 17, paddingVertical: 22, gap: 8 }}>
      <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>TEXTE ARABE</Text>
      <Text style={{ color: colors.text, fontSize: large ? 34 : 27, lineHeight: large ? 55 : 48, textAlign: "right", writingDirection: "rtl" }}>{text}</Text>
    </View>
  );
}

function DetailShell({ eyebrow, title, onClose, onPrevious, onNext, children }: {
  eyebrow: string; title: string; onClose: () => void; onPrevious?: () => void; onNext?: () => void; children: ReactNode;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={{ borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 20, gap: 17 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={{ color: colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1.5 }}>{eyebrow}</Text>
          <Text style={{ color: colors.text, fontSize: 21, fontWeight: "800" }}>{title}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Fermer le détail" onPress={onClose} style={{ padding: 8, borderRadius: 12, backgroundColor: colors.surfaceAlt }}>
          <Ionicons name="close" size={20} color={colors.muted} />
        </Pressable>
      </View>
      {children}
      {onPrevious || onNext ? (
        <View style={{ flexDirection: "row", gap: 10, marginTop: 2 }}>
          {onPrevious ? (
            <Pressable accessibilityRole="button" onPress={onPrevious} style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 13, alignItems: "center" }}>
              <Text style={{ color: colors.text, fontWeight: "700" }}>Précédent</Text>
            </Pressable>
          ) : null}
          {onNext ? (
            <Pressable accessibilityRole="button" onPress={onNext} style={{ flex: 1, backgroundColor: colors.primary, borderRadius: 14, padding: 13, alignItems: "center" }}>
              <Text style={{ color: colors.primaryText, fontWeight: "800" }}>Suivant</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function SectionText({ label, text }: { label: string; text: string }) {
  const { colors } = useAppTheme();
  if (!text) return null;
  return (
    <View style={{ gap: 7 }}>
      <Text style={{ color: colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1.2 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 15, lineHeight: 25 }}>{text}</Text>
    </View>
  );
}

function ExtraDetails({ entries }: { entries: [string, unknown][] }) {
  const { colors } = useAppTheme();
  if (!entries.length) return null;
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 15, gap: 10 }}>
      <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "900", letterSpacing: 1.2 }}>INFORMATIONS COMPLÉMENTAIRES</Text>
      <ResourceValue value={Object.fromEntries(entries)} />
    </View>
  );
}

type DetailBaseProps = { item: RecordValue; onClose: () => void; onPrevious?: () => void; onNext?: () => void };

function HadithDetail({ item, onClose, onPrevious, onNext }: DetailBaseProps) {
  const { colors } = useAppTheme();
  const h = buildHadith(item);
  const referenceRows: { icon: keyof typeof Ionicons.glyphMap; label: string; text: string }[] = [
    { icon: "library-outline" as const, label: "Recueil", text: h.collection },
    { icon: "pricetag-outline" as const, label: "Numéro", text: h.number },
    { icon: "bookmark-outline" as const, label: "Livre / chapitre", text: h.book },
    { icon: "book-outline" as const, label: "Source / référence", text: h.source },
  ].filter((row) => row.text);
  return (
    <DetailShell eyebrow="LECTURE & RÉFLEXION" title={h.title} onClose={onClose} onPrevious={onPrevious} onNext={onNext}>
      {h.grade ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Chip icon="shield-checkmark-outline" label={h.grade} />
        </View>
      ) : null}
      <ArabicBlock text={h.arabic} />
      {h.narrator ? (
        <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 13 }}>
          <InfoBlock icon="people-outline" label="Rapporté par" text={h.narrator} />
        </View>
      ) : null}
      <SectionText label="TEXTE DU HADITH" text={h.meaning} />
      {h.hint ? (
        <View style={{ borderRadius: 18, padding: 15, backgroundColor: colors.surfaceAlt }}>
          <InfoBlock icon="shield-checkmark-outline" label="Que signifie ce degré ?" text={h.hint} />
        </View>
      ) : null}
      {h.explanation ? (
        <View style={{ borderRadius: 18, padding: 15, backgroundColor: colors.surfaceAlt }}>
          <InfoBlock icon="bulb-outline" label="À retenir" text={h.explanation} />
        </View>
      ) : null}
      {referenceRows.length ? (
        <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 13, gap: 12 }}>
          {referenceRows.map((row) => <InfoBlock key={row.label} icon={row.icon} label={row.label} text={row.text} />)}
        </View>
      ) : null}
      {!h.arabic && !h.meaning ? (
        <Text style={{ color: colors.muted, lineHeight: 22 }}>Aucun texte n’est fourni pour ce hadith.</Text>
      ) : null}
    </DetailShell>
  );
}

function NameDetail({ item, onClose, onPrevious, onNext }: DetailBaseProps) {
  const { colors } = useAppTheme();
  const n = buildName(item);
  return (
    <DetailShell eyebrow="APPRENDRE UN NOM" title={n.title} onClose={onClose} onPrevious={onPrevious} onNext={onNext}>
      {n.number ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Chip icon="ribbon-outline" label={`Nom n° ${n.number} sur 99`} />
        </View>
      ) : null}
      <ArabicBlock text={n.arabic} large />
      {n.latin && n.latin !== n.title ? <SectionText label="PRONONCIATION" text={n.latin} /> : null}
      <SectionText label="SIGNIFICATION" text={n.meaning} />
      {n.explanation ? (
        <View style={{ borderRadius: 18, padding: 15, backgroundColor: colors.surfaceAlt }}>
          <InfoBlock icon="bulb-outline" label="Pour mieux comprendre" text={n.explanation} />
        </View>
      ) : null}
      <ExtraDetails entries={n.extras} />
      {!n.arabic && !n.meaning ? (
        <Text style={{ color: colors.muted, lineHeight: 22 }}>Aucun détail n’est fourni pour ce nom.</Text>
      ) : null}
    </DetailShell>
  );
}

function DuaDetail({ item, kind, category, onClose, onPrevious, onNext }: {
  item: RecordValue;
  kind: ResourceKind;
  category?: string;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
}) {
  const { colors } = useAppTheme();
  const title = getTitle(item, 0);
  const arabic = getArabic(item);
  const meaning = getMeaning(item);
  const categoryLabel = category || getText(item, ["categoryName", "category_name", "category", "categoryTitle"]);
  const repetitions = getText(item, ["repetitions", "repeat", "repeatCount", "repeat_count", "repeatTimes", "repeat_times", "times", "count", "numberOfRepetitions"]);
  const reportedBy = getText(item, ["reportedBy", "reported_by", "narratedBy", "narrated_by", "narrator", "transmittedBy", "transmitted_by"]);
  const source = getText(item, ["source", "reference", "citation", "attribution", "hadithReference", "hadith_reference"]);
  const instruction = getText(item, ["instruction", "instructions", "usage", "howToUse", "how_to_use", "whenToSay", "when_to_say", "occasion"]);
  const metadataKeys = new Set(["category", "categoryName", "category_name", "categoryTitle", "repetitions", "repeat", "repeatCount", "repeat_count", "repeatTimes", "repeat_times", "times", "count", "numberOfRepetitions", "reportedBy", "reported_by", "narratedBy", "narrated_by", "narrator", "transmittedBy", "transmitted_by", "source", "reference", "citation", "attribution", "hadithReference", "hadith_reference", "instruction", "instructions", "usage", "howToUse", "how_to_use", "whenToSay", "when_to_say", "occasion"]);
  const excluded = new Set(["id", "_id", "title", "name", "nameEnglish", "english", "translation", "meaning", "meaningEnglish", "englishMeaning", "text", "textEnglish", "arabic", "arabicText", "textArabic", "text_ar", "text_arabic", "arabic_text", "nameArabic", "arabicName", "ar", "duaArabic", "dua_arabic", "hadithArabic", "dua", ...(kind === "duas" ? [...metadataKeys] : [])]);
  const details = Object.entries(item).filter(([key, value]) => !excluded.has(key) && value !== undefined && value !== null && value !== "");
  return (
    <View style={{ borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 20, gap: 17 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={{ color: colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1.5 }}>
            {kind === "names" ? "APPRENDRE UN NOM" : kind === "hadith" ? "LECTURE & RÉFLEXION" : "INVOCATION"}
          </Text>
          <Text style={{ color: colors.text, fontSize: 21, fontWeight: "800" }}>{title}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Fermer le détail" onPress={onClose} style={{ padding: 8, borderRadius: 12, backgroundColor: colors.surfaceAlt }}>
          <Ionicons name="close" size={20} color={colors.muted} />
        </Pressable>
      </View>
      {kind === "duas" && categoryLabel ? (
        <View style={{ flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 7, borderRadius: 14, paddingHorizontal: 11, paddingVertical: 8, backgroundColor: colors.surfaceAlt }}>
          <Ionicons name="pricetag-outline" size={15} color={colors.primary} />
          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "800" }}>{categoryLabel}</Text>
        </View>
      ) : null}
      {arabic ? (
        <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: 20, paddingHorizontal: 17, paddingVertical: 22, gap: 8 }}>
          <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>TEXTE ARABE</Text>
          <Text style={{ color: colors.text, fontSize: kind === "names" ? 34 : 27, lineHeight: kind === "names" ? 55 : 48, textAlign: "right", writingDirection: "rtl" }}>{arabic}</Text>
        </View>
      ) : null}
      {kind === "duas" && (instruction || repetitions) ? (
        <View style={{ borderRadius: 18, padding: 15, gap: 9, backgroundColor: colors.surfaceAlt }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="list-outline" size={18} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "900" }}>Instructions</Text>
          </View>
          {instruction ? <Text style={{ color: colors.text, fontSize: 14, lineHeight: 22 }}>{instruction}</Text> : null}
          {repetitions ? <Text style={{ color: colors.text, fontSize: 14, lineHeight: 22 }}>Répéter cette invocation {/^\d+$/.test(repetitions) ? repetitions + " fois" : repetitions}.</Text> : null}
        </View>
      ) : null}
      {kind === "duas" && (reportedBy || source) ? (
        <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 13, gap: 10 }}>
          {reportedBy ? (
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
              <Ionicons name="people-outline" size={18} color={colors.primary} style={{ marginTop: 1 }} />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "900" }}>Rapportée par</Text>
                <Text style={{ color: colors.text, fontSize: 13, lineHeight: 20 }}>{reportedBy}</Text>
              </View>
            </View>
          ) : null}
          {source ? (
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
              <Ionicons name="book-outline" size={18} color={colors.primary} style={{ marginTop: 1 }} />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "900" }}>Source / référence</Text>
                <Text style={{ color: colors.text, fontSize: 13, lineHeight: 20 }}>{source}</Text>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
      {meaning ? (
        <View style={{ gap: 7 }}>
          <Text style={{ color: colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1.2 }}>
            {kind === "names" ? "SIGNIFICATION" : kind === "hadith" ? "TRADUCTION / SENS" : "TRADUCTION"}
          </Text>
          <Text style={{ color: colors.text, fontSize: 15, lineHeight: 25 }}>{meaning}</Text>
        </View>
      ) : null}
      {details.length ? (
        <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 15 }}>
          <ResourceValue value={Object.fromEntries(details)} />
        </View>
      ) : null}
      {!arabic && !meaning && !details.length ? (
        <Text style={{ color: colors.muted, lineHeight: 22 }}>Aucun détail supplémentaire n’est fourni pour cette ressource.</Text>
      ) : null}
      {onPrevious || onNext ? (
        <View style={{ flexDirection: "row", gap: 10, marginTop: 2 }}>
          {onPrevious ? (
            <Pressable accessibilityRole="button" onPress={onPrevious} style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 13, alignItems: "center" }}>
              <Text style={{ color: colors.text, fontWeight: "700" }}>Précédent</Text>
            </Pressable>
          ) : null}
          {onNext ? (
            <Pressable accessibilityRole="button" onPress={onNext} style={{ flex: 1, backgroundColor: colors.primary, borderRadius: 14, padding: 13, alignItems: "center" }}>
              <Text style={{ color: colors.primaryText, fontWeight: "800" }}>Suivant</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function DetailCard(props: {
  item: RecordValue;
  kind: ResourceKind;
  category?: string;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
}) {
  if (props.kind === "hadith") return <HadithDetail {...props} />;
  if (props.kind === "names") return <NameDetail {...props} />;
  return <DuaDetail {...props} />;
}
