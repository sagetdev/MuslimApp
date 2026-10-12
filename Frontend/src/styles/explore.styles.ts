import { StyleSheet } from "react-native";
import { useAppTheme } from "../theme/ThemeProvider";

export default function createExploreStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    container: { flex: 1 },
    content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 38, gap: 22, width: "100%", maxWidth: 920, alignSelf: "center" },
    heading: { gap: 7, paddingTop: 4 },
    eyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.8 },
    title: { fontSize: 31, fontWeight: "800", letterSpacing: -0.8 },
    subtitle: { fontSize: 14, lineHeight: 22, maxWidth: 460 },
    moduleList: { gap: 9, paddingVertical: 3 },
    moduleButton: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 },
    panel: { borderWidth: 1, borderRadius: 24, padding: 17, gap: 14 },
    panelHeading: { flexDirection: "row", alignItems: "center", gap: 12 },
    moduleIcon: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    panelTitle: { fontSize: 18, fontWeight: "800", letterSpacing: -0.25 },
    panelSubtitle: { fontSize: 12, lineHeight: 18 },
    searchBox: { flexDirection: "row", alignItems: "center", gap: 9, borderWidth: 1, borderRadius: 16, paddingHorizontal: 13, minHeight: 50 },
    searchInput: { flex: 1, paddingVertical: 11, fontSize: 14 },
    searchButton: { minHeight: 45, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, borderRadius: 14 },
    feedback: { minHeight: 140, alignItems: "center", justifyContent: "center", gap: 12, padding: 22 },
    errorCard: { borderWidth: 1, borderRadius: 20, padding: 20, alignItems: "center", gap: 12 },
    errorTitle: { fontSize: 16, fontWeight: "800", textAlign: "center" },
    errorText: { fontSize: 13, lineHeight: 20, textAlign: "center" },
    resultTitle: { fontSize: 18, fontWeight: "800" },
    dataCard: { borderWidth: 1, borderRadius: 18, padding: 15, gap: 10 },
    itemIndex: { fontSize: 11, fontWeight: "900" },
    fieldLabel: { fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 },
    valueText: { fontSize: 14, lineHeight: 22 },
  });
}