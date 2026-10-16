import { Ionicons } from "@expo/vector-icons";
import BackButton from "../components/BackButton";
import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing } from "react-native";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { normalizeDegrees, prefetchQibla, qiblaCache, subscribeQibla } from "../src/lib/qiblaCache";
import { useAppTheme } from "../src/theme/ThemeProvider";

const READY_STATUS = "Angle calculé. Oriente le haut de ton téléphone vers la flèche.";
const LOADING_STATUS = "Récupération de ta position…";

export default function QiblaScreen() {
  const { colors } = useAppTheme();
  const [bearing, setBearing] = useState<number | null>(qiblaCache.bearing);
  const [heading, setHeading] = useState<number | null>(null);
  const [status, setStatus] = useState(
    qiblaCache.bearing === null ? LOADING_STATUS : READY_STATUS
  );
  const [loading, setLoading] = useState(qiblaCache.bearing === null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [usingMagneticHeading, setUsingMagneticHeading] = useState(false);
  const animatedHeading = useRef(new Animated.Value(0)).current;
  const continuousHeading = useRef(0);
  const lastDisplayUpdate = useRef(0);
  const filteredHeading = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    let subscription: Location.LocationSubscription | undefined;
    let unsubscribe: (() => void) | undefined;
    const refreshing = refreshKey > 0;

    void (async () => {
      setHeading(null);
      setUsingMagneticHeading(false);
      continuousHeading.current = 0;
      lastDisplayUpdate.current = 0;
      filteredHeading.current = null;
      animatedHeading.setValue(0);

      setBearing(qiblaCache.bearing);
      const needsLoading = qiblaCache.bearing === null || refreshing;
      setLoading(needsLoading);
      setStatus(needsLoading ? LOADING_STATUS : READY_STATUS);

      try {
        let permission = await Location.getForegroundPermissionsAsync();
        if (permission.status !== "granted") {
          permission = await Location.requestForegroundPermissionsAsync();
        }
        if (permission.status !== "granted") {
          throw new Error(
            "La localisation est nécessaire pour calculer la Qibla. Autorise-la dans les réglages de ton appareil."
          );
        }
        if (!active) return;

        // Le calcul vient du cache : dès qu'une position est disponible, l'angle s'affiche.
        unsubscribe = subscribeQibla((value) => {
          if (!active) return;
          setBearing(value);
          setStatus(READY_STATUS);
          setLoading(false);
        });

        void prefetchQibla(refreshing).then(() => {
          if (!active) return;
          if (qiblaCache.bearing === null) {
            setStatus("Impossible de déterminer la direction de la Qibla.");
          }
          setLoading(false);
        });

        // La boussole démarre sans attendre le GPS.
        try {
          subscription = await Location.watchHeadingAsync((value) => {
            if (!active) return;

            const trueHeadingIsValid =
              Number.isFinite(value.trueHeading) && value.trueHeading >= 0;
            const magneticHeadingIsValid =
              Number.isFinite(value.magHeading) && value.magHeading >= 0;

            const rawHeading = trueHeadingIsValid
              ? normalizeDegrees(value.trueHeading)
              : magneticHeadingIsValid
                ? normalizeDegrees(value.magHeading)
                : null;

            if (rawHeading === null) return;
            setUsingMagneticHeading(!trueHeadingIsValid);

            if (filteredHeading.current === null) {
              filteredHeading.current = rawHeading;
              continuousHeading.current = rawHeading;
              setHeading(rawHeading);
              animatedHeading.setValue(rawHeading);
              return;
            }

            // Écart signé le plus court entre le cap filtré et le cap brut (évite le saut 359° → 0°).
            let diff = rawHeading - filteredHeading.current;
            if (diff > 180) diff -= 360;
            if (diff < -180) diff += 360;

            // Zone morte anti-tremblement.
            if (Math.abs(diff) < 1) return;

            // Filtre passe-bas : converge toujours vers le cap réel (plus de dérive d'angle).
            const step = diff * (Math.abs(diff) > 20 ? 0.6 : 0.25);
            filteredHeading.current = normalizeDegrees(filteredHeading.current + step);
            continuousHeading.current += step;

            animatedHeading.stopAnimation();
            Animated.timing(animatedHeading, {
              toValue: continuousHeading.current,
              duration: 120,
              easing: Easing.linear,
              useNativeDriver: true,
            }).start();

            const now = Date.now();
            if (now - lastDisplayUpdate.current >= 250) {
              lastDisplayUpdate.current = now;
              setHeading(Math.round(filteredHeading.current));
            }
          });
        } catch {
          if (active) {
            setStatus(
              "Angle calculé, mais la boussole de cet appareil n’est pas disponible. La direction reste affichée sans suivi en temps réel."
            );
          }
        }
      } catch (error) {
        if (active) {
          setStatus(
            error instanceof Error
              ? error.message
              : "Impossible de déterminer la direction de la Qibla."
          );
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
      unsubscribe?.();
      subscription?.remove();
    };
  }, [refreshKey]);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["top", "left", "right"]}
    >
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 36,
          gap: 20,
          alignItems: "center",
          maxWidth: 760,
          width: "100%",
          alignSelf: "center",
        }}
      >
        <BackButton />
        <View style={{ width: "100%", gap: 7 }}>
          <Text style={{ color: colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1.8 }}>
            ORIENTATION
          </Text>
          <Text style={{ color: colors.text, fontSize: 30, fontWeight: "800" }}>
            Direction de la Qibla
          </Text>
          <Text style={{ color: colors.muted, lineHeight: 21 }}>
            L’angle est calculé depuis ta position GPS jusqu’à la Kaaba. La flèche suit l’orientation de ton téléphone.
          </Text>
        </View>

        <View
          style={{
            width: 280,
            height: 280,
            borderRadius: 140,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            alignItems: "center",
            justifyContent: "center",
            marginTop: 8,
            overflow: "hidden",
          }}
        >
          {/* The compass rose rotates against the phone heading. */}
          <Animated.View
            style={{
              position: "absolute",
              width: 260,
              height: 260,
              borderRadius: 130,
              borderWidth: 1,
              borderColor: colors.border,
              transform: [
                {
                  rotate: animatedHeading.interpolate({
                    inputRange: [-3600, 3600],
                    outputRange: ["3600deg", "-3600deg"],
                    extrapolate: "extend",
                  }),
                },
              ],
            }}
          >
            <View style={{ position: "absolute", top: 10, alignSelf: "center", alignItems: "center" }}>
              <Text style={{ color: colors.primary, fontSize: 17, fontWeight: "900" }}>N</Text>
            </View>
            <View style={{ position: "absolute", bottom: 10, alignSelf: "center", alignItems: "center" }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}>S</Text>
            </View>
            <View style={{ position: "absolute", right: 10, top: 0, bottom: 0, justifyContent: "center" }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}>E</Text>
            </View>
            <View style={{ position: "absolute", left: 10, top: 0, bottom: 0, justifyContent: "center" }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}>W</Text>
            </View>
            <View
              style={{
                position: "absolute",
                top: 28,
                bottom: 28,
                left: 128.5,
                width: 1,
                backgroundColor: colors.border,
              }}
            />
            <View
              style={{
                position: "absolute",
                left: 28,
                right: 28,
                top: 128.5,
                height: 1,
                backgroundColor: colors.border,
              }}
            />
            {/* Qibla pointer pivots around the exact compass center. */}
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                alignItems: "center",
                justifyContent: "center",
                transform: [{ rotate: `${bearing ?? 0}deg` }],
              }}
            >
              <View
                style={{
                  position: "absolute",
                  top: 29,
                  width: 4,
                  height: 100,
                  borderRadius: 2,
                  backgroundColor: colors.primary,
                }}
              />
              <View
                style={{
                  position: "absolute",
                  top: 9,
                  width: 0,
                  height: 0,
                  borderLeftWidth: 9,
                  borderRightWidth: 9,
                  borderBottomWidth: 20,
                  borderLeftColor: "transparent",
                  borderRightColor: "transparent",
                  borderBottomColor: colors.primary,
                }}
              />
            </View>
          </Animated.View>

          {/* Fixed center icon: its needle always points where the top of the phone is pointing. */}
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: colors.surfaceAlt,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View style={{ transform: [{ rotate: "-45deg" }] }}>
              <Ionicons name="compass" size={38} color={colors.primary} />
            </View>
          </View>

          {heading === null ? (
            <View
              style={{
                position: "absolute",
                bottom: 4,
                backgroundColor: colors.surface,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 10,
              }}
            >
              <Text style={{ color: colors.muted, fontSize: 10 }}>CAP INDISPONIBLE</Text>
            </View>
          ) : null}
        </View>

        <View
          style={{
            width: "100%",
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 22,
            padding: 20,
            alignItems: "center",
            gap: 8,
          }}
        >
          {loading ? <ActivityIndicator color={colors.primary} /> : null}
          <Text style={{ color: colors.muted, fontSize: 12 }}>ANGLE DEPUIS LE NORD VRAI</Text>
          <Text style={{ color: colors.text, fontSize: 34, fontWeight: "900" }}>
            {bearing === null ? "—" : `${Math.round(bearing)}°`}
          </Text>
          {heading !== null ? (
            <Text style={{ color: colors.muted, fontSize: 13 }}>
              Cap du téléphone : {Math.round(heading)}°
            </Text>
          ) : null}
          <Text style={{ color: colors.muted, textAlign: "center", lineHeight: 21 }}>
            {status}
          </Text>
          {usingMagneticHeading ? (
            <Text style={{ color: colors.muted, fontSize: 11, textAlign: "center", lineHeight: 17 }}>
              Le nord magnétique est utilisé car le nord vrai n’est pas fourni par le capteur. Une légère différence peut apparaître selon ta région.
            </Text>
          ) : null}
          {bearing !== null && heading === null && !loading ? (
            <Text style={{ color: colors.muted, fontSize: 11, textAlign: "center", lineHeight: 17 }}>
              La flèche indique la direction depuis le nord de référence, mais le suivi en temps réel nécessite un capteur de boussole compatible.
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => setRefreshKey((current) => current + 1)}
            disabled={loading}
            style={{ padding: 12, opacity: loading ? 0.6 : 1 }}
          >
            <Text style={{ color: colors.primary, fontWeight: "800" }}>
              {loading ? "Calcul en cours…" : "Actualiser ma position"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}