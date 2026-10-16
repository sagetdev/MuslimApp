import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";

export const KAABA = { latitude: 21.422487, longitude: 39.826206 };
const COORDS_KEY = "muslimapp:qibla:coords:v1";

export function normalizeDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

/** Cap initial (grand cercle), en degrés depuis le nord vrai, de l'utilisateur vers la Kaaba. */
export function calculateQiblaBearing(latitude: number, longitude: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const lat1 = rad(latitude);
  const lat2 = rad(KAABA.latitude);
  const dLon = rad(KAABA.longitude - longitude);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return normalizeDegrees((Math.atan2(y, x) * 180) / Math.PI);
}

export const qiblaCache: {
  bearing: number | null;
  coords: { latitude: number; longitude: number } | null;
} = { bearing: null, coords: null };

const listeners = new Set<(bearing: number) => void>();

export function subscribeQibla(listener: (bearing: number) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function applyCoords(latitude: number, longitude: number, persist: boolean) {
  const bearing = calculateQiblaBearing(latitude, longitude);
  qiblaCache.coords = { latitude, longitude };
  qiblaCache.bearing = bearing;
  listeners.forEach((listener) => listener(bearing));
  if (persist) {
    void AsyncStorage.setItem(COORDS_KEY, JSON.stringify({ latitude, longitude })).catch(() => {});
  }
}

let running: Promise<void> | null = null;

/** Position → cache → calcul instantané. Appelé au lancement de l'app. */
export function prefetchQibla(force = false): Promise<void> {
  if (running && !force) return running;

  running = (async () => {
    try {
      // 1. Dernières coordonnées sauvegardées : bearing disponible en quelques ms.
      if (qiblaCache.bearing === null) {
        const raw = await AsyncStorage.getItem(COORDS_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as { latitude?: number; longitude?: number };
          if (Number.isFinite(saved.latitude) && Number.isFinite(saved.longitude)) {
            applyCoords(saved.latitude as number, saved.longitude as number, false);
          }
        }
      }

      let permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        permission = await Location.requestForegroundPermissionsAsync();
      }
      if (permission.status !== "granted") return;

      // 2. Dernière position connue de l'OS (instantané).
      const last = await Location.getLastKnownPositionAsync();
      if (last) applyCoords(last.coords.latitude, last.coords.longitude, true);

      // 3. Position fraîche (précision basse = rapide, largement suffisant pour la Qibla).
      const fresh = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      applyCoords(fresh.coords.latitude, fresh.coords.longitude, true);
    } catch {
      // Non bloquant : l'écran Qibla gère l'absence de position.
    }
  })();

  return running;
}