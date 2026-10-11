
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

export type ThemeMode = "dark" | "light";

const palettes = {
  dark: {
    background: "#0B1220",
    surface: "#141E30",
    surfaceAlt: "#1B2940",
    text: "#F5F7FB",
    muted: "#9BA9BD",
    primary: "#D8B56D",
    primaryText: "#0B1220",
    border: "#29374C",
    success: "#65C99A",
    tabBar: "#101827",
  },
  light: {
    background: "#F5F7F4",
    surface: "#FFFFFF",
    surfaceAlt: "#EAF0E9",
    text: "#17251F",
    muted: "#68786F",
    primary: "#197653",
    primaryText: "#FFFFFF",
    border: "#DCE5DD",
    success: "#197653",
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
    <ThemeContext.Provider
      value={{
        mode,
        colors: palettes[mode],
        toggleTheme,
      }}
    >
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
