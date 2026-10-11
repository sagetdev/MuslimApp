import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { start } from "../src/lib/quranPreloader";
import { isBundleDownloaded } from "../src/lib/quranBundle";
import { ThemeProvider, useAppTheme } from "../src/theme/ThemeProvider";

function RootNavigator() {
  const { mode, colors } = useAppTheme();
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    (async () => {
      const hasBundle = await isBundleDownloaded();
      if (hasBundle) {
        // Tout est déjà téléchargé → pas besoin de précharger
        return;
      }
      // Sinon, précharge en arrière-plan (page par page, Wi-Fi seulement)
      await start(1, true);
    })();
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
        <Stack.Screen
          name="quran-download"
          options={{ presentation: "modal" }}
        />
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