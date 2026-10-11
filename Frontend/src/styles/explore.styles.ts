import { StyleSheet } from "react-native";
import { useAppTheme } from "../theme/ThemeProvider";

export default function createExploreStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 20, paddingBottom: 36, gap: 20, width: "100%", maxWidth: 920, alignSelf: "center" },
    heading: { gap: 6, paddingTop: 8 },
    eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
    title: { fontSize: 30, fontWeight: "800", letterSpacing: -0.5 },
    subtitle: { fontSize: 14, lineHeight: 21 },
    moduleList: { gap: 8, paddingVertical: 2 },
    moduleButton: { flexDirection: "row", alignItems: "center", gap: 7, borderWidth: 1, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 11 },
    panel: { borderWidth: 1, borderRadius: 22, padding: 16, gap: 13 },
    panelHeading: { flexDirection: "row", alignItems: "center", gap: 12 },
    moduleIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    panelTitle: { fontSize: 18, fontWeight: "800" },
    panelSubtitle: { fontSize: 12, lineHeight: 17 },
    searchBox: { flexDirection: "row", alignItems: "center", gap: 9, borderWidth: 1, borderRadius: 13, paddingHorizontal: 12, minHeight: 46 },
    searchInput: { flex: 1, paddingVertical: 10, fontSize: 14 },
    searchButton: { minHeight: 43, alignItems: "center", justifyContent: "center", paddingHorizontal: 15, borderRadius: 13 },
    feedback: { minHeight: 130, alignItems: "center", justifyContent: "center", gap: 12, padding: 20 },
    errorCard: { borderWidth: 1, borderRadius: 18, padding: 18, alignItems: "center", gap: 12 },
    errorTitle: { fontSize: 16, fontWeight: "700", textAlign: "center" },
    errorText: { fontSize: 13, lineHeight: 19, textAlign: "center" },
    resultTitle: { fontSize: 18, fontWeight: "700" },
    dataCard: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 9 },
    itemIndex: { fontSize: 11, fontWeight: "800" },
    fieldLabel: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6 },
    valueText: { fontSize: 14, lineHeight: 21 },
  });
};