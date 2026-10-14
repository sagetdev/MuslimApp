import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BackButton from "../components/BackButton";
import { apiFetch } from "../src/lib/api";
import { getHijriCache, setHijriCache } from "../src/lib/hijriCache";
import { useAppTheme } from "../src/theme/ThemeProvider";

type RecordValue = Record<string, unknown>;
type HijriParts = { day: number; month: number; year: number; monthName: string };
type IslamicEvent = { id: string; title: string; dateLabel: string; gregorianDate?: string; hijriDay?: number; hijriMonth?: number; description?: string };

type CountdownColors = { primary: string; muted: string; surfaceAlt: string };


function EventCountdown({ targetTime, colors }: { targetTime: number; colors: CountdownColors }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const remaining = Math.max(0, targetTime - now);
  if (remaining === 0) {
    return (
      <View accessibilityLabel="L’événement a lieu aujourd’hui" style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 13, backgroundColor: colors.surfaceAlt }}>
        <Ionicons name="calendar-outline" size={17} color={colors.primary} />
        <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "800" }}>C’est aujourd’hui</Text>
      </View>
    );
  }

  const days = Math.ceil(remaining / 86_400_000);

  return (
    <View accessibilityLabel={`Décompte avant l’événement : ${days} jour(s)`} style={{ flexDirection: "row", gap: 7 }}>
      <View style={{ flex: 1, alignItems: "center", paddingVertical: 14, borderRadius: 13, backgroundColor: colors.surfaceAlt, gap: 3 }}>
        <Text style={{ color: colors.primary, fontSize: 28, fontWeight: "900", fontVariant: ["tabular-nums"] }}>{days}</Text>
        <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "800", letterSpacing: 0.8 }}>{days > 1 ? "JOURS" : "JOUR"}</Text>
      </View>
    </View>
  );
}

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const HIJRI_MONTHS = [
  "Mouharram", "Safar", "Rabia al-awwal", "Rabia ath-thani",
  "Joumada al-oula", "Joumada ath-thania", "Rajab", "Chaabane",
  "Ramadan", "Chawwal", "Dhou al qi'da", "Dhou al-hijja",
];

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function isValidDateKey(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function unwrap(value: unknown): unknown {
  let current = value;
  for (let i = 0; i < 4; i += 1) {
    if (!current || typeof current !== "object" || Array.isArray(current) || !("data" in current)) break;
    current = (current as RecordValue).data;
  }
  return current;
}

function asText(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (value && typeof value === "object") {
    const record = value as RecordValue;
    for (const key of ["name", "title", "text", "value", "formatted", "label", "english", "en"]) {
      const result = asText(record[key]);
      if (result) return result;
    }
  }
  return "";
}

function asRecords(value: unknown, preferredKeys: string[]): RecordValue[] {
  const unwrapped = unwrap(value);
  if (Array.isArray(unwrapped)) return unwrapped.filter((item): item is RecordValue => !!item && typeof item === "object");
  if (!unwrapped || typeof unwrapped !== "object") return [];
  const object = unwrapped as RecordValue;
  for (const key of preferredKeys) {
    if (Array.isArray(object[key])) {
      return (object[key] as unknown[]).filter((item): item is RecordValue => !!item && typeof item === "object");
    }
  }
  return [];
}

function readHijriParts(date: Date): HijriParts | null {
  try {
    const formatter = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
      day: "numeric", month: "numeric", year: "numeric",
      timeZone: "UTC",
    });
    const parts = formatter.formatToParts(new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12)));
    const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
    const day = get("day");
    const month = get("month");
    const year = get("year");
    if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return null;
    let monthName = HIJRI_MONTHS[month - 1] ?? "";
    try {
      monthName = new Intl.DateTimeFormat("fr-FR-u-ca-islamic-umalqura", {
        month: "long", timeZone: "UTC",
      }).format(new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12)));
    } catch {}
    return { day, month, year, monthName };
  } catch {
    return null;
  }
}

function findStringDeep(value: unknown, keys: string[], depth = 0): string {
  if (depth > 5 || value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findStringDeep(item, keys, depth + 1);
      if (found) return found;
    }
    return "";
  }
  if (typeof value !== "object") return "";
  const object = value as RecordValue;
  for (const key of keys) {
    const item = object[key];
    if (typeof item === "string" || typeof item === "number") {
      const text = String(item).trim();
      if (text) return text;
    }
  }
  for (const item of Object.values(object)) {
    const found = findStringDeep(item, keys, depth + 1);
    if (found) return found;
  }
  return "";
}

function normalizeEvent(item: RecordValue, index: number): IslamicEvent {
  const title = asText(
    item.title ?? item.name ?? item.event ?? item.eventName ?? item.english ?? item.label
  ) || `Événement islamique ${index + 1}`;
  const rawDate = asText(item.gregorianDate ?? item.gregorian_date ?? item.date ?? item.startDate ?? item.start_date);
  const dateMatch = rawDate.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  const hijriDayRaw = item.hijriDay ?? item.hijri_day ?? item.day;
  const hijriMonthRaw = item.hijriMonth ?? item.hijri_month ?? item.month;
  const hijriDay = Number(hijriDayRaw);
  const hijriMonth = Number(hijriMonthRaw);
  return {
    id: asText(item.id ?? item.slug ?? item.key) || `event-${index}`,
    title,
    dateLabel: rawDate || (
      Number.isFinite(hijriDay) && Number.isFinite(hijriMonth)
        ? `${hijriDay} ${HIJRI_MONTHS[hijriMonth - 1] ?? `mois ${hijriMonth}`}`
        : "Date variable selon l’observation lunaire"
    ),
    gregorianDate: dateMatch?.[1] && isValidDateKey(dateMatch[1]) ? dateMatch[1] : undefined,
    hijriDay: Number.isFinite(hijriDay) && hijriDay >= 1 && hijriDay <= 30 ? hijriDay : undefined,
    hijriMonth: Number.isFinite(hijriMonth) && hijriMonth >= 1 && hijriMonth <= 12 ? hijriMonth : undefined,
    description: asText(item.description ?? item.summary ?? item.details),
  };
}

function findNextGregorianDateForHijri(day: number | undefined, month: number | undefined, fromDate: Date): string | undefined {
  if (!day || !month) return undefined;
  for (let offset = 0; offset <= 370; offset++) {
    const candidate = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate() + offset, 12);
    const hijri = readHijriParts(candidate);
    if (hijri?.day === day && hijri.month === month) return localDateKey(candidate);
  }
  return undefined;
}

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat("fr-CA", { month: "long", year: "numeric" }).format(date);
}

function longDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("fr-CA", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(date);
}

export default function HijriScreen() {
  const { colors } = useAppTheme();
  const today = useMemo(() => new Date(), []);
  const todayKey = localDateKey(today);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1, 12));
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const [hijriDetail, setHijriDetail] = useState<unknown>(null);
  const [events, setEvents] = useState<IslamicEvent[]>([]);
  const [islamicMonths, setIslamicMonths] = useState<string[]>([]);
  const [loadingDate, setLoadingDate] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [dateError, setDateError] = useState("");
  const [eventsError, setEventsError] = useState("");

  const selectedDate = useMemo(() => parseDateKey(selectedKey), [selectedKey]);
  const selectedHijri = useMemo(() => readHijriParts(selectedDate), [selectedDate]);
  const currentHijri = useMemo(() => readHijriParts(today), [today]);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  const loadSelectedDate = useCallback(async () => {
    const cacheKey = `${selectedKey}|${timezone}`;
    const cached = getHijriCache<unknown>(`date:${cacheKey}`);
    if (cached !== undefined) {
      setHijriDetail(cached);
      setDateError("");
      setLoadingDate(false);
      return;
    }

    setLoadingDate(true);
    setDateError("");
    try {
      const response = await apiFetch<unknown>("/hijri-date", {
        params: { date: selectedKey, timezone },
      });
      const detail = unwrap(response);
      setHijriCache(`date:${cacheKey}`, detail);
      setHijriDetail(detail);
    } catch (error) {
      setHijriDetail(null);
      setDateError(error instanceof Error ? error.message : "Impossible de convertir cette date.");
    } finally {
      setLoadingDate(false);
    }
  }, [selectedKey, timezone]);

  const loadCalendarData = useCallback(async () => {
    const cachedEvents = getHijriCache<IslamicEvent[]>(`events:${timezone}`);
    const cachedMonths = getHijriCache<string[]>("months:default");
    if (cachedEvents) setEvents(cachedEvents);
    if (cachedMonths) setIslamicMonths(cachedMonths);
    if (cachedEvents && cachedMonths) {
      setEventsError("");
      setLoadingEvents(false);
      return;
    }

    setLoadingEvents(true);
    setEventsError("");
    try {
      const [eventsResult, monthsResult] = await Promise.allSettled([
        cachedEvents ? Promise.resolve(null) : apiFetch<unknown>("/islamic-events", { params: { timezone } }),
        cachedMonths ? Promise.resolve(null) : apiFetch<unknown>("/islamic-months"),
      ]);

      if (cachedEvents) {
        setEvents(cachedEvents);
      } else if (eventsResult.status === "fulfilled") {
        const eventRecords = asRecords(eventsResult.value, ["events", "items", "results", "islamicEvents"]);
        const normalizedEvents = eventRecords.map(normalizeEvent);
        setHijriCache(`events:${timezone}`, normalizedEvents);
        setEvents(normalizedEvents);
      } else {
        setEvents([]);
        setEventsError(eventsResult.reason instanceof Error
          ? eventsResult.reason.message
          : "Les événements n’ont pas pu être chargés.");
      }

      if (cachedMonths) {
        setIslamicMonths(cachedMonths);
      } else if (monthsResult.status === "fulfilled") {
        const monthRecords = asRecords(monthsResult.value, ["months", "items", "results", "islamicMonths"]);
        const names = monthRecords.map((item) => asText(item.name ?? item.title ?? item.english ?? item.month)).filter(Boolean);
        if (names.length) {
          setHijriCache("months:default", names);
          setIslamicMonths(names);
        }
      }
    } catch (error) {
      setEventsError(error instanceof Error ? error.message : "Les événements n’ont pas pu être chargés.");
    } finally {
      setLoadingEvents(false);
    }
  }, [timezone]);

  useEffect(() => { void loadSelectedDate(); }, [loadSelectedDate]);
  useEffect(() => { void loadCalendarData(); }, [loadCalendarData]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1, 12);
    const mondayOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
    const previousMonthDays = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 0).getDate();
    const total = Math.ceil((mondayOffset + daysInMonth) / 7) * 7;
    return Array.from({ length: total }, (_, index) => {
      const dayNumber = index - mondayOffset + 1;
      const date = dayNumber < 1
        ? new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, previousMonthDays + dayNumber, 12)
        : dayNumber > daysInMonth
          ? new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, dayNumber - daysInMonth, 12)
          : new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), dayNumber, 12);
      return {
        date,
        key: localDateKey(date),
        inMonth: date.getMonth() === visibleMonth.getMonth(),
        hijri: readHijriParts(date),
      };
    });
  }, [visibleMonth]);

  const selectedEvents = useMemo(() => {
    return events.filter((event) => {
      if (event.gregorianDate && event.gregorianDate === selectedKey) return true;
      return Boolean(
        selectedHijri &&
        event.hijriDay === selectedHijri.day &&
        event.hijriMonth === selectedHijri.month
      );
    });
  }, [events, selectedKey, selectedHijri]);

  const upcomingEvents = useMemo(() => {
    const todayDate = parseDateKey(todayKey);
    return events
      .map((event) => ({
        ...event,
        countdownDate: event.gregorianDate ?? findNextGregorianDateForHijri(event.hijriDay, event.hijriMonth, todayDate),
      }))
      .filter((event) => event.countdownDate && parseDateKey(event.countdownDate).getTime() >= todayDate.getTime())
      .sort((a, b) => (a.countdownDate ?? "").localeCompare(b.countdownDate ?? ""))
      .slice(0, 3);
  }, [events, todayKey]);

  const nextEvent = upcomingEvents[0];
  const nextEventDate = nextEvent?.countdownDate;
  const nextEventTarget = nextEventDate ? parseDateKey(nextEventDate).getTime() : null;

  const changeMonth = (amount: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1, 12));
  };

  const chooseDate = (key: string) => {
    setSelectedKey(key);
    const date = parseDateKey(key);
    if (date.getMonth() !== visibleMonth.getMonth() || date.getFullYear() !== visibleMonth.getFullYear()) {
      setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1, 12));
    }
  };

  const monthNames = islamicMonths.length === 12 ? islamicMonths : HIJRI_MONTHS;
  const detailLabel = findStringDeep(hijriDetail, [
    "formatted", "hijriDate", "hijri_date", "readable", "dateString", "date_string", "display",
  ]);
  const detailMonth = findStringDeep(hijriDetail, ["monthName", "month_name", "month"]);
  const detailYear = findStringDeep(hijriDetail, ["year"]);
  const authoritativeHijri = detailLabel || (
    selectedHijri
      ? `${selectedHijri.day} ${monthNames[selectedHijri.month - 1] ?? selectedHijri.monthName} ${selectedHijri.year} AH`
      : "Date hégirienne indisponible"
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: 38, gap: 18, width: "100%", maxWidth: 760, alignSelf: "center" }}
        showsVerticalScrollIndicator={false}
      >
        <BackButton />

        <View style={{ gap: 7 }}>
          <Text style={{ color: colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1.8 }}>MUSLIMAPP · CALENDRIER</Text>
          <Text style={{ color: colors.text, fontSize: 31, fontWeight: "900", letterSpacing: -0.8 }}>Calendrier islamique</Text>
          <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 22 }}>Explore les dates grégoriennes, leur correspondance hégirienne et les repères importants de l’année.</Text>
        </View>

        <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 24, padding: 19, gap: 10, overflow: "hidden" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="moon-outline" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "800", letterSpacing: 0.8 }}>AUJOURD’HUI</Text>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: "800", textTransform: "capitalize" }}>{longDateLabel(today)}</Text>
            </View>
          </View>
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 3 }} />
          <Text style={{ color: colors.primary, fontSize: 25, fontWeight: "900" }}>
            {currentHijri ? `${currentHijri.day} ${currentHijri.monthName || monthNames[currentHijri.month - 1]} ${currentHijri.year} AH` : "Date hégirienne"}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
            La date peut varier selon l’observation locale du croissant lunaire.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => { setSelectedKey(todayKey); setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1, 12)); }}
            style={({ pressed }) => ({ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.surfaceAlt, opacity: pressed ? 0.7 : 1 })}
          >
            <Ionicons name="locate-outline" size={16} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "800" }}>Revenir à aujourd’hui</Text>
          </Pressable>
        </View>

        <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 24, padding: 15, gap: 15 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Mois précédent" hitSlop={8} onPress={() => changeMonth(-1)} style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="chevron-back" size={21} color={colors.text} />
            </Pressable>
            <View style={{ flex: 1, alignItems: "center", gap: 4 }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: "900", textTransform: "capitalize" }}>{monthLabel(visibleMonth)}</Text>
              <Text style={{ color: colors.muted, fontSize: 11 }}>Sélectionne une date</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Mois suivant" hitSlop={8} onPress={() => changeMonth(1)} style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="chevron-forward" size={21} color={colors.text} />
            </Pressable>
          </View>

          <View style={{ flexDirection: "row", gap: 2 }}>
            {WEEKDAYS.map((day) => (
              <View key={day} style={{ flex: 1, alignItems: "center", paddingVertical: 7 }}>
                <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "800" }}>{day}</Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 5 }}>
            {calendarDays.map(({ date, key, inMonth, hijri }) => {
              const selected = key === selectedKey;
              const isToday = key === todayKey;
              const hasEvent = events.some((event) =>
                (event.gregorianDate && event.gregorianDate === key) ||
                Boolean(hijri && event.hijriDay === hijri.day && event.hijriMonth === hijri.month)
              );
              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityLabel={`${longDateLabel(date)}${hijri ? `, ${hijri.day} ${hijri.monthName}` : ""}${hasEvent ? ", événement islamique" : ""}`}
                  accessibilityState={{ selected }}
                  onPress={() => chooseDate(key)}
                  style={({ pressed }) => ({
                    width: "14.2857%",
                    minHeight: 58,
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 3,
                    borderRadius: 13,
                    borderWidth: selected || hasEvent || isToday ? (selected ? 1.5 : hasEvent ? 1.25 : 1) : 0,
                    borderColor: selected ? colors.primary : hasEvent ? colors.primary : isToday ? colors.border : "transparent",
                    backgroundColor: selected ? colors.primary : hasEvent ? colors.surfaceAlt : isToday ? colors.surfaceAlt : "transparent",
                    opacity: pressed ? 0.7 : inMonth ? 1 : 0.42,
                  })}
                >
                  <Text style={{ color: selected ? colors.primaryText : colors.text, fontSize: 14, fontWeight: selected || isToday ? "900" : "700", fontVariant: ["tabular-nums"] }}>{date.getDate()}</Text>
                  <Text style={{ color: selected ? colors.primaryText : colors.muted, fontSize: 9, fontWeight: "600" }}>{hijri?.day ?? "—"}</Text>
                  {hasEvent ? <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}><Ionicons name="star" size={8} color={selected ? colors.primaryText : colors.primary} /><View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: selected ? colors.primaryText : colors.primary }} /></View> : <View style={{ height: 8 }} />}
                </Pressable>
              );
            })}
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 14, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, flexWrap: "wrap" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary }} />
              <Text style={{ color: colors.muted, fontSize: 11 }}>Événement</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 12, height: 12, borderRadius: 4, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt }} />
              <Text style={{ color: colors.muted, fontSize: 11 }}>Aujourd’hui</Text>
            </View>
            <Text style={{ color: colors.muted, fontSize: 11 }}>Grégorien · Hégirien</Text>
          </View>
        </View>

        <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 24, padding: 19, gap: 13 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceAlt }}>
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ color: colors.text, fontSize: 17, fontWeight: "900", textTransform: "capitalize" }}>{longDateLabel(selectedDate)}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>Date hégirienne correspondante</Text>
            </View>
          </View>
          {loadingDate ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 }}>
              <ActivityIndicator color={colors.primary} />
              <Text style={{ color: colors.muted, fontSize: 13 }}>Conversion de la date…</Text>
            </View>
          ) : (
            <Text style={{ color: colors.primary, fontSize: 23, lineHeight: 31, fontWeight: "900" }}>{authoritativeHijri}</Text>
          )}
          {detailMonth || detailYear ? <Text style={{ color: colors.muted, fontSize: 12 }}>{[detailMonth, detailYear].filter(Boolean).join(" · ")}</Text> : null}
          {dateError ? (
            <View style={{ gap: 7 }}>
              <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>La conversion en ligne est indisponible. Une estimation locale reste affichée si elle est prise en charge par l’appareil.</Text>
              <Pressable accessibilityRole="button" onPress={() => void loadSelectedDate()} style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8 }}>
                <Ionicons name="refresh-outline" size={16} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "800" }}>Réessayer</Text>
              </Pressable>
            </View>
          ) : null}
          {selectedEvents.length ? (
            <View style={{ gap: 9, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 13 }}>
              <Text style={{ color: colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1.2 }}>REPÈRE ISLAMIQUE</Text>
              {selectedEvents.map((event) => (
                <View key={event.id} style={{ gap: 5 }}>
                  <Text style={{ color: colors.text, fontSize: 15, fontWeight: "800" }}>{event.title}</Text>
                  {event.description ? <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>{event.description}</Text> : null}
                  <Text style={{ color: colors.muted, fontSize: 11 }}>{event.dateLabel}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 19 }}>
              {loadingEvents ? "Recherche des repères islamiques…" : "Aucun événement répertorié pour cette date."}
            </Text>
          )}
        </View>

        <View style={{ gap: 12 }}>
          {nextEvent ? (
            <View style={{ backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1.5, borderRadius: 22, padding: 17, gap: 13 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceAlt }}>
                  <Ionicons name="hourglass-outline" size={21} color={colors.primary} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={{ color: colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1.2 }}>PROCHAIN ÉVÉNEMENT</Text>
                  <Text style={{ color: colors.text, fontSize: 17, fontWeight: "900" }}>{nextEvent.title}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>{nextEventDate ? longDateLabel(parseDateKey(nextEventDate)) : nextEvent.dateLabel}</Text>
                </View>
              </View>
              {nextEventTarget !== null && nextEventTarget <= Date.now() ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 13, backgroundColor: colors.surfaceAlt }}>
                  <Ionicons name="calendar-outline" size={17} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "800" }}>C’est aujourd’hui</Text>
                </View>
              ) : nextEventTarget !== null ? (
                <EventCountdown targetTime={nextEventTarget} colors={{ primary: colors.primary, muted: colors.muted, surfaceAlt: colors.surfaceAlt }} />
              ) : null}
              {nextEvent.description ? <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 19 }}>{nextEvent.description}</Text> : null}
            </View>
          ) : null}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <Text style={{ color: colors.text, fontSize: 19, fontWeight: "900" }}>Repères islamiques</Text>
            <Text style={{ color: colors.muted, fontSize: 11 }}>{events.length ? `${events.length} repère${events.length > 1 ? "s" : ""}` : ""}</Text>
          </View>
          {loadingEvents ? (
            <View style={{ paddingVertical: 20, alignItems: "center", gap: 10 }}>
              <ActivityIndicator color={colors.primary} />
              <Text style={{ color: colors.muted, fontSize: 12 }}>Chargement des événements…</Text>
            </View>
          ) : upcomingEvents.length ? (
            upcomingEvents.map((event) => (
              <Pressable
                key={event.id}
                accessibilityRole="button"
                onPress={() => {
                  if (event.gregorianDate) chooseDate(event.gregorianDate);
                  else if (event.hijriDay && event.hijriMonth) {
                    const match = calendarDays.find((day) => day.hijri?.day === event.hijriDay && day.hijri?.month === event.hijriMonth);
                    if (match) chooseDate(match.key);
                  }
                }}
                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 15, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.75 : 1 })}
              >
                <View style={{ width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceAlt }}>
                  <Ionicons name="star-outline" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: colors.text, fontSize: 14, fontWeight: "800" }}>{event.title}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>{event.dateLabel}</Text>
                  {event.description ? <Text numberOfLines={2} style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>{event.description}</Text> : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Pressable>
            ))
          ) : (
            <View style={{ padding: 17, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: 8 }}>
              <Text style={{ color: colors.text, fontWeight: "800" }}>{eventsError ? "Événements indisponibles" : "Aucun événement daté à venir"}</Text>
              <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 19 }}>{eventsError || "Les dates des fêtes peuvent varier selon le pays et l’observation du croissant lunaire."}</Text>
              {eventsError ? <Pressable accessibilityRole="button" onPress={() => void loadCalendarData()} style={{ alignSelf: "flex-start", paddingVertical: 6 }}><Text style={{ color: colors.primary, fontWeight: "800" }}>Réessayer</Text></Pressable> : null}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
