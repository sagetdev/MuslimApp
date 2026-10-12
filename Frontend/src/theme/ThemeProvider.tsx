import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeMode = "dark" | "light";
const THEME_KEY = "muslimapp:theme:v1";
const palettes = {
  dark: {
    background: "#08140F", surface: "#102119", surfaceAlt: "#172D22",
    text: "#F4F3E9", muted: "#A6B6AA", primary: "#D5B879",
    primaryText: "#102016", border: "#294336", success: "#83C9A0", tabBar: "#0D1C14",
  },
  light: {
    background: "#F6F5EF", surface: "#FFFFFF", surfaceAlt: "#EEF1E8",
    text: "#17281F", muted: "#69796F", primary: "#216B4B",
    primaryText: "#FFFFFF", border: "#DCE4DA", success: "#216B4B", tabBar: "#FFFFFF",
  },
};
type Palette = (typeof palettes)["dark"];
type ThemeContextValue = { mode: ThemeMode; colors: Palette; toggleTheme: () => void };
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("dark");
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(THEME_KEY).then((stored) => {
      if (active && (stored === "dark" || stored === "light")) setMode(stored);
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  function toggleTheme() {
    setMode((current) => {
      const next = current === "dark" ? "light" : "dark";
      void AsyncStorage.setItem(THEME_KEY, next).catch(() => {});
      return next;
    });
  }
  return <ThemeContext.Provider value={{ mode, colors: palettes[mode], toggleTheme }}>{children}</ThemeContext.Provider>;
}
export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useAppTheme must be used inside ThemeProvider");

  // Fallback protects screens during hot reloads or when an older local
  // bundle still has a partially initialized theme value.
  const colors = context.colors ?? palettes[context.mode === "light" ? "light" : "dark"];
  return { ...context, colors };
}
