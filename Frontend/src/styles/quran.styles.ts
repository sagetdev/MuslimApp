import { StyleSheet } from "react-native";
import { useAppTheme } from "../theme/ThemeProvider";

export default function createQuranStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 },
    headerTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
    iconButton: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
    content: { paddingHorizontal: 12, paddingBottom: 32, alignItems: "center" },
    frame: { borderWidth: 2, borderColor: colors.primary, borderRadius: 6, padding: 4 },
    paper: { borderWidth: 1, borderColor: colors.primary, borderRadius: 3, backgroundColor: colors.surface, paddingVertical: 12, paddingHorizontal: 12 },
    
    // Style spécifique pour l'encadrement authentique des Pages 1 & 2
    specialPaperContainer: {
      justifyContent: "center",
      borderWidth: 2,
      borderColor: colors.primary,
      backgroundColor: colors.surfaceAlt,
      paddingVertical: 18,
    },

    line: { direction: "ltr", flexDirection: "row-reverse", alignItems: "center" },
    headerSlot: { alignItems: "center", justifyContent: "center" },
    banner: { width: "100%", height: "84%", borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.surfaceAlt, borderRadius: 4, alignItems: "center", justifyContent: "center" },
    pageNumber: { color: colors.primary, fontFamily: "UthmanicHafs", fontSize: 16, textAlign: "center", marginTop: 8 },
    credit: { color: colors.muted, fontSize: 10, textAlign: "center", marginTop: 14 },
    footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 20, width: "100%" },
    navButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 14, backgroundColor: colors.primary },
    navButtonDisabled: { opacity: 0.35 },
    navText: { color: colors.primaryText, fontWeight: "700", fontSize: 13 },
    pageLabel: { color: colors.muted, fontSize: 13, fontWeight: "600" },
    feedback: { minHeight: 260, alignItems: "center", justifyContent: "center", gap: 12, padding: 20 },
    feedbackText: { color: colors.muted, fontSize: 13, textAlign: "center", lineHeight: 19 },
    retryButton: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: 13, backgroundColor: colors.primary },
    retryText: { color: colors.primaryText, fontWeight: "700" },
    
    mushafHeaderContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    },
    mushafHeaderSubtext: {
    color: colors.primary,
    fontFamily: "UthmanicHafs",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    minWidth: 90,
    },
  });
}