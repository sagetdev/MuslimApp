import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

export type ThemeMode = "dark" | "light";

const palettes = {
  dark: {
    background: "#08140F",
    surface: "#102119",
    surfaceAlt: "#172D22",
    text: "#F4F3E9",
    muted: "#A6B6AA",
    primary: "#D5B879",
    primaryText: "#102016",
    border: "#294336",
    success: "#83C9A0",
    tabBar: "#0D1C14",
  },
  light: {
    background: "#F6F5EF",
    surface: "#FFFFFF",
    surfaceAlt: "#EEF1E8",
    text: "#17281F",
    muted: "#69796F",
    primary: "#216B4B",
    primaryText: "#FFFFFF",
    border: "#DCE4DA",
    success: "#216B4B",
    tabBar: "#FFFFFF",
  },
};

type Palette = (typeof palettes)["dark"];

type ThemeContextValue = {
  mode: ThemeMode;
  colors: Palette;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("dark");

  function toggleTheme() {
    setMode((current) => (current === "dark" ? "light" : "dark"));
  }

  return (
    <ThemeContext.Provider value={{ mode, colors: palettes[mode], toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useAppTheme must be used inside ThemeProvider");
  }

  return context;
}
