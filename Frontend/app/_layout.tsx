import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { preloadOfflineQuran } from "../src/lib/quranOffline";
import { ThemeProvider, useAppTheme } from "../src/theme/ThemeProvider";
import { loadHafsFont, startFontPreload } from "../src/lib/quranFonts";

function RootNavigator() {
  const { mode, colors } = useAppTheme();

    useEffect(() => {
      void preloadOfflineQuran();
      void loadHafsFont().catch(() => {});
      startFontPreload(1);
    }, []);

  return (
    <>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootNavigator />
    </ThemeProvider>
  );
}