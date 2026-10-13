import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";

export type ThemeMode = "dark" | "light";
export type ThemePreference = ThemeMode | "system";
const THEME_KEY = "muslimapp:theme:v1";
const palettes = {
  dark: {
    background: "#08140F", surface: "#102119", surfaceAlt: "#172D22",
    text: "#F4F3E9", muted: "#A6B6AA", primary: "#D5B879",
    primaryText: "#102016", border: "#294336", success: "#83C9A0", danger: "#E57373", tabBar: "#0D1C14",
  },
  light: {
    background: "#F6F5EF", surface: "#FFFFFF", surfaceAlt: "#EEF1E8",
    text: "#17281F", muted: "#69796F", primary: "#216B4B",
    primaryText: "#FFFFFF", border: "#DCE4DA", success: "#216B4B", danger: "#B3261E", tabBar: "#FFFFFF",
  },
};
type Palette = (typeof palettes)["dark"];
type ThemeContextValue = {
  mode: ThemeMode;
  preference: ThemePreference;
  colors: Palette;
  setPreference: (preference: ThemePreference) => void;
  toggleTheme: () => void;
};
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("dark");

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(THEME_KEY).then((stored) => {
      if (active && (stored === "dark" || stored === "light" || stored === "system")) {
        setPreferenceState(stored);
      }
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const mode: ThemeMode = preference === "system" ? (system === "light" ? "light" : "dark") : preference;

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    void AsyncStorage.setItem(THEME_KEY, next).catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    setPreference(mode === "dark" ? "light" : "dark");
  }, [mode, setPreference]);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, preference, colors: palettes[mode], setPreference, toggleTheme }),
    [mode, preference, setPreference, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useAppTheme must be used inside ThemeProvider");

  // Fallback protects screens during hot reloads or when an older local
  // bundle still has a partially initialized theme value.
  const colors = context.colors ?? palettes[context.mode === "light" ? "light" : "dark"];
  return { ...context, colors };
}
