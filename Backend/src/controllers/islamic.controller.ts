
import type { Request, Response, NextFunction } from "express";
import { getCache, setCache } from "../lib/cache.js";
import { fetchUmmahPath } from "../services/ummah.service.js";

type ProxyConfig = {
  path: string;
  cacheKey: string;
  ttlMs?: number;
};

type PathBuilder = (req: Request) => ProxyConfig | null;

function getParam(value: unknown): string | null {
  return typeof value === "string" && value.length > 0
    ? value
    : null;
}

function getInteger(
  value: unknown,
  min: number,
  max: number,
  defaultValue?: number,
): number | null {
  if (value === undefined && defaultValue !== undefined) {
    return defaultValue;
  }

  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    return null;
  }

  const number = Number(value);

  return Number.isSafeInteger(number) && number >= min && number <= max
    ? number
    : null;
}

function queryString(value: string): string {
  return new URLSearchParams({ q: value }).toString();
}

export function createIslamicProxy(builder: PathBuilder) {
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
            message: "One or more query or path parameters are invalid.",
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

const COLLECTIONS = [
  "bukhari",
  "muslim",
  "abudawud",
  "tirmidhi",
  "ibnmajah",
  "nasai",
  "malik",
];

const validCollection = (value: string) =>
  COLLECTIONS.includes(value);

const queryParam = (req: Request, name: string) =>
  getParam(req.query[name]);

const param = (req: Request, name: string) =>
  getParam(req.params[name]);

function searchConfig(
  req: Request,
  endpoint: string,
  extra: Record<string, string> = {},
): ProxyConfig | null {
  const q = queryParam(req, "q");

  if (!q || !q.trim() || q.length > 100) return null;

  const params = new URLSearchParams({
    q: q.trim(),
    ...extra,
  });

  return {
    path: `${endpoint}?${params.toString()}`,
    cacheKey: `${endpoint}:${params.toString().toLowerCase()}`,
  };
}

// -------------------- HADITH --------------------

export const hadithCollections = createIslamicProxy(() => ({
  path: "/api/hadith/collections",
  cacheKey: "hadith:collections",
}));

export const randomHadith = createIslamicProxy((req) => {
  const collection = queryParam(req, "collection");

  if (collection && !validCollection(collection)) return null;

  const params = new URLSearchParams();
  if (collection) params.set("collection", collection);

  return {
    path: `/api/hadith/random${params.size ? `?${params}` : ""}`,
    cacheKey: `hadith:random:${collection ?? "all"}`,
    ttlMs: 30_000,
  };
});

export const searchHadith = createIslamicProxy((req) => {
  const collection = queryParam(req, "collection");
  const limit = getInteger(req.query.limit, 1, 50, 25);

  if (limit === null) return null;
  if (collection && !validCollection(collection)) return null;

  return searchConfig(req, "/api/hadith/search", {
    ...(collection ? { collection } : {}),
    limit: String(limit),
  });
});

export const browseHadith = createIslamicProxy((req) => {
  const collection = param(req, "collection");
  const page = getInteger(req.query.page, 1, 100_000, 1);
  const limit = getInteger(req.query.limit, 1, 100, 50);

  if (!collection || !validCollection(collection)) return null;
  if (page === null || limit === null) return null;

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  return {
    path: `/api/hadith/${collection}?${params}`,
    cacheKey: `hadith:browse:${collection}:${page}:${limit}`,
  };
});

export const specificHadith = createIslamicProxy((req) => {
  const collection = param(req, "collection");
  const number = param(req, "number");

  if (!collection || !validCollection(collection)) return null;
  if (!number || !/^\d+$/.test(number)) return null;

  return {
    path: `/api/hadith/${collection}/${number}`,
    cacheKey: `hadith:${collection}:${number}`,
  };
});

// -------------------- DUAS --------------------

export const allDuas = createIslamicProxy(() => ({
  path: "/api/duas",
  cacheKey: "duas:all",
}));

export const duaCategories = createIslamicProxy(() => ({
  path: "/api/duas/categories",
  cacheKey: "duas:categories",
}));

export const randomDua = createIslamicProxy(() => ({
  path: "/api/duas/random",
  cacheKey: "duas:random",
  ttlMs: 30_000,
}));

export const searchDuas = createIslamicProxy((req) =>
  searchConfig(req, "/api/duas/search"),
);

export const duasByCategory = createIslamicProxy((req) => {
  const category = param(req, "category");

  if (!category || !/^[a-z0-9_-]+$/i.test(category)) return null;

  return {
    path: `/api/duas/category/${encodeURIComponent(category)}`,
    cacheKey: `duas:category:${category.toLowerCase()}`,
  };
});

export const specificDua = createIslamicProxy((req) => {
  const id = getInteger(req.params.id, 1, 100_000);

  if (id === null) return null;

  return {
    path: `/api/duas/${id}`,
    cacheKey: `duas:${id}`,
  };
});

// -------------------- 99 NOMS D'ALLAH --------------------

export const allNamesOfAllah = createIslamicProxy(() => ({
  path: "/api/asma-ul-husna",
  cacheKey: "asma:all",
}));

export const specificNameOfAllah = createIslamicProxy((req) => {
  const number = getInteger(req.params.number, 1, 99);

  if (number === null) return null;

  return {
    path: `/api/asma-ul-husna/${number}`,
    cacheKey: `asma:${number}`,
  };
});

export const randomNameOfAllah = createIslamicProxy(() => ({
  path: "/api/asma-ul-husna/random",
  cacheKey: "asma:random",
  ttlMs: 30_000,
}));

export const searchNamesOfAllah = createIslamicProxy((req) =>
  searchConfig(req, "/api/asma-ul-husna/search"),
);

export const dailyNamesOfAllah = createIslamicProxy((req) => {
  const day = getInteger(req.params.day, 1, 7);

  if (day === null) return null;

  return {
    path: `/api/asma-ul-husna/daily/${day}`,
    cacheKey: `asma:daily:${day}`,
  };
});
