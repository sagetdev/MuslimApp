import { StyleSheet } from "react-native";
import { useAppTheme } from "../theme/ThemeProvider";

export default function createQuranStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 },
    headerTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
    iconButton: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
    content: { paddingHorizontal: 16, paddingBottom: 32, width: "100%", maxWidth: 720, alignSelf: "center" },
    paper: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 24, paddingVertical: 24, paddingHorizontal: 18, gap: 18 },
    banner: { borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.surfaceAlt, borderRadius: 14, paddingVertical: 10, alignItems: "center" },
    bannerText: { color: colors.primary, fontFamily: "AmiriQuran_400Regular", fontSize: 26, lineHeight: 44 },
    quranText: { color: colors.text, fontFamily: "AmiriQuran_400Regular", fontSize: 28, lineHeight: 62, textAlign: "justify", writingDirection: "rtl" },
    marker: { color: colors.primary, fontFamily: "AmiriQuran_400Regular", fontSize: 24 },
    footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 20 },
    navButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 14, backgroundColor: colors.primary },
    navButtonDisabled: { opacity: 0.35 },
    navText: { color: colors.primaryText, fontWeight: "700", fontSize: 13 },
    pageLabel: { color: colors.muted, fontSize: 13, fontWeight: "600" },
    feedback: { minHeight: 200, alignItems: "center", justifyContent: "center", gap: 12, padding: 20 },
    feedbackText: { color: colors.muted, fontSize: 13, textAlign: "center", lineHeight: 19 },
    retryButton: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: 13, backgroundColor: colors.primary },
    retryText: { color: colors.primaryText, fontWeight: "700" },
  });
}