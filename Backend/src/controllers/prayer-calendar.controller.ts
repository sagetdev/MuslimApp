
import type { Request, Response, NextFunction } from "express";
import { getCache, setCache } from "../lib/cache.js";
import { fetchUmmahPath } from "../services/ummah.service.js";

type Config = {
  path: string;
  cacheKey: string;
  ttlMs?: number;
};

type Builder = (req: Request) => Config | null;

function stringParam(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function numberParam(
  value: unknown,
  min: number,
  max: number,
): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;

  const number = Number(value);

  if (!Number.isFinite(number) || number < min || number > max) {
    return null;
  }

  return number;
}

function integerParam(
  value: unknown,
  min: number,
  max: number,
  fallback?: number,
): number | null {
  if (value === undefined && fallback !== undefined) return fallback;
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;

  const number = Number(value);

  return Number.isSafeInteger(number) && number >= min && number <= max
    ? number
    : null;
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function validTimezone(value: string): boolean {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function readTimezone(req: Request): string | null | undefined {
  const value = req.query.timezone;

  if (value === undefined) return undefined;
  if (typeof value !== "string" || !validTimezone(value)) return null;

  return value;
}

function readMethod(req: Request): string | null | undefined {
  const value = req.query.method;

  if (value === undefined) return undefined;

  if (
    typeof value !== "string" ||
    !/^[a-zA-Z0-9_-]{1,40}$/.test(value)
  ) {
    return null;
  }

  return value;
}

function readMadhab(req: Request): string | null | undefined {
  const value = req.query.madhab;

  if (value === undefined) return undefined;
  if (typeof value !== "string") return null;

  const normalized = value.toLowerCase();

  return normalized === "hanafi" || normalized === "shafi"
    ? normalized
    : null;
}

function readHighLatitudeRule(
  req: Request,
): string | null | undefined {
  const value = req.query.highLatitudeRule;

  if (value === undefined) return undefined;

  const allowed = [
    "middleofthenight",
    "seventhofthenight",
    "twilightangle",
  ];

  if (typeof value !== "string") return null;

  const normalized = value.toLowerCase();

  return allowed.includes(normalized) ? normalized : null;
}

function makeUrl(path: string, params: Record<string, string>): string {
  const query = new URLSearchParams(params);
  return `${path}?${query.toString()}`;
}

export function createPrayerCalendarEndpoint(builder: Builder) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const config = builder(req);

      if (!config) {
        res.status(400).json({
          error: {
            code: "INVALID_PARAMETERS",
            message: "One or more parameters are invalid.",
          },
        });
        return;
      }

      const cached = getCache<unknown>(config.cacheKey);

      if (cached !== undefined) {
        res.setHeader("X-Cache", "HIT");
        res.status(200).json({ data: cached });
        return;
      }

      const data = await fetchUmmahPath(config.path);

      setCache(config.cacheKey, data, config.ttlMs);

      res.setHeader("X-Cache", "MISS");
      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  };
}

// ---------------- HORAIRES DE PRIÈRE ----------------

export const getPrayerTimes = createPrayerCalendarEndpoint((req) => {
  const lat = numberParam(req.query.lat, -90, 90);
  const lng = numberParam(req.query.lng, -180, 180);
  const dateValue = stringParam(req.query.date);
  const timezone = readTimezone(req);
  const method = readMethod(req);
  const madhab = readMadhab(req);
  const highLatitudeRule = readHighLatitudeRule(req);

  if (lat === null || lng === null) return null;
  if (req.query.date !== undefined &&
      (!dateValue || !validDate(dateValue))) return null;
  if (timezone === null || method === null ||
      madhab === null || highLatitudeRule === null) return null;

  const params: Record<string, string> = {
    lat: String(lat),
    lng: String(lng),
  };

  if (dateValue) params.date = dateValue;
  if (timezone) params.timezone = timezone;
  if (method) params.method = method;
  if (madhab) params.madhab = madhab;
  if (highLatitudeRule) params.highLatitudeRule = highLatitudeRule;

  const path = makeUrl("/api/prayer-times", params);

  return {
    path,
    cacheKey: `prayer-times:${params.date ?? new Date().toISOString().slice(0, 10)}:${new URLSearchParams(params)}`,
    ttlMs: 60 * 60 * 1000,
  };
});

export const getPrayerMethods = createPrayerCalendarEndpoint(() => ({
  path: "/api/prayer-times/methods",
  cacheKey: "prayer-times:methods",
}));

export const getMonthlyPrayerTimes = createPrayerCalendarEndpoint((req) => {
  const lat = numberParam(req.query.lat, -90, 90);
  const lng = numberParam(req.query.lng, -180, 180);
  const month = integerParam(
    req.query.month,
    1,
    12,
    new Date().getMonth() + 1,
  );
  const year = integerParam(
    req.query.year,
    1937,
    2077,
    new Date().getFullYear(),
  );

  const timezone = readTimezone(req);
  const method = readMethod(req);
  const madhab = readMadhab(req);
  const highLatitudeRule = readHighLatitudeRule(req);

  if (lat === null || lng === null || month === null || year === null) {
    return null;
  }

  if (timezone === null || method === null ||
      madhab === null || highLatitudeRule === null) return null;

  const params: Record<string, string> = {
    lat: String(lat),
    lng: String(lng),
    month: String(month),
    year: String(year),
  };

  if (timezone) params.timezone = timezone;
  if (method) params.method = method;
  if (madhab) params.madhab = madhab;
  if (highLatitudeRule) params.highLatitudeRule = highLatitudeRule;

  const path = makeUrl("/api/prayer-times/month", params);

  return {
    path,
    cacheKey: `prayer-times:month:${new URLSearchParams(params)}`,
    ttlMs: 6 * 60 * 60 * 1000,
  };
});

// ---------------- QIBLA ----------------

export const getQibla = createPrayerCalendarEndpoint((req) => {
  const lat = numberParam(req.query.lat, -90, 90);
  const lng = numberParam(req.query.lng, -180, 180);

  if (lat === null || lng === null) return null;

  const params = { lat: String(lat), lng: String(lng) };

  return {
    path: makeUrl("/api/qibla", params),
    cacheKey: `qibla:${params.lat}:${params.lng}`,
    ttlMs: 24 * 60 * 60 * 1000,
  };
});

// ---------------- CALENDRIER HÉGIRIEN ----------------

export const getTodayHijri = createPrayerCalendarEndpoint((req) => {
  const timezone = readTimezone(req);

  if (timezone === null) return null;

  const params: Record<string, string> = {};
  if (timezone) params.timezone = timezone;

  return {
    path: Object.keys(params).length
      ? makeUrl("/api/today-hijri", params)
      : "/api/today-hijri",
    cacheKey: `hijri:today:${timezone ?? "UTC"}:${new Date().toISOString().slice(0, 10)}`,
    ttlMs: 60 * 60 * 1000,
  };
});

export const convertToHijri = createPrayerCalendarEndpoint((req) => {
  const date = stringParam(req.query.date);
  const timezone = readTimezone(req);

  if (req.query.date !== undefined && (!date || !validDate(date))) {
    return null;
  }

  if (timezone === null) return null;

  const params: Record<string, string> = {};
  if (date) params.date = date;
  if (timezone) params.timezone = timezone;

  return {
    path: Object.keys(params).length
      ? makeUrl("/api/hijri-date", params)
      : "/api/hijri-date",
    cacheKey: `hijri:date:${date ?? "today"}:${timezone ?? "UTC"}`,
    ttlMs: 24 * 60 * 60 * 1000,
  };
});

export const convertToGregorian = createPrayerCalendarEndpoint((req) => {
  const year = integerParam(req.query.year, 1356, 1500);
  const month = integerParam(req.query.month, 1, 12);
  const day = integerParam(req.query.day, 1, 30);

  if (year === null || month === null || day === null) return null;

  const params = {
    year: String(year),
    month: String(month),
    day: String(day),
  };

  return {
    path: makeUrl("/api/gregorian-date", params),
    cacheKey: `gregorian:${params.year}:${params.month}:${params.day}`,
    ttlMs: 24 * 60 * 60 * 1000,
  };
});

export const getIslamicMonths = createPrayerCalendarEndpoint(() => ({
  path: "/api/islamic-months",
  cacheKey: "hijri:months",
}));

export const getIslamicEvents = createPrayerCalendarEndpoint((req) => {
  const timezone = readTimezone(req);

  if (timezone === null) return null;

  const params: Record<string, string> = {};
  if (timezone) params.timezone = timezone;

  return {
    path: Object.keys(params).length
      ? makeUrl("/api/islamic-events", params)
      : "/api/islamic-events",
    cacheKey: `hijri:events:${timezone ?? "UTC"}:${new Date().toISOString().slice(0, 10)}`,
    ttlMs: 60 * 60 * 1000,
  };
});
