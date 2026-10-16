import { CalculationMethod, Coordinates, HighLatitudeRule, Madhab, PrayerTimes } from "adhan";
import type { PrayerPrefs } from "./prayerPrefs";

export const PRAYER_NAMES = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;
export type PrayerName = (typeof PRAYER_NAMES)[number];
export type DayTimes = Record<PrayerName, Date>;
export type Coords = { latitude: number; longitude: number };

const METHODS: Record<string, () => ReturnType<typeof CalculationMethod.MuslimWorldLeague>> = {
  MWL: CalculationMethod.MuslimWorldLeague,
  UmmAlQura: CalculationMethod.UmmAlQura,
  Egyptian: CalculationMethod.Egyptian,
  Karachi: CalculationMethod.Karachi,
  ISNA: CalculationMethod.NorthAmerica,
};

export function computePrayerTimes(coords: Coords, prefs: PrayerPrefs, date: Date): DayTimes {
  const params = (METHODS[prefs.method] ?? CalculationMethod.MuslimWorldLeague)();
  params.madhab = prefs.madhab === "hanafi" ? Madhab.Hanafi : Madhab.Shafi;
  params.highLatitudeRule = HighLatitudeRule.SeventhOfTheNight;

  const times = new PrayerTimes(new Coordinates(coords.latitude, coords.longitude), date, params);

  return {
    Fajr: times.fajr,
    Dhuhr: times.dhuhr,
    Asr: times.asr,
    Maghrib: times.maghrib,
    Isha: times.isha,
  };
}

export function formatHHMM(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}