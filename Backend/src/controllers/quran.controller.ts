
import type {
  Request,
  Response,
  NextFunction,
} from "express";

import { getCache, setCache } from "../lib/cache.js";

import {
  fetchAyah,
  fetchSurahs,
  fetchSurah,
  fetchPage,
  searchQuran,
} from "../services/ummah.service.js";

async function respondWithCache(
  res: Response,
  key: string,
  loader: () => Promise<unknown>,
): Promise<void> {
  const cached = getCache<unknown>(key);

  if (cached !== undefined) {
    res.setHeader("X-Cache", "HIT");
    res.status(200).json({ data: cached });
    return;
  }

  const data = await loader();

  setCache(key, data);

  res.setHeader("X-Cache", "MISS");
  res.status(200).json({ data });
}


function parseInteger(
  value: string | string[],
  min: number,
  max: number,
): number | null {
  if (typeof value !== "string") return null;
  if (!/^\d+$/.test(value)) return null;

  const number = Number(value);

  if (
    !Number.isSafeInteger(number) ||
    number < min ||
    number > max
  ) {
    return null;
  }

  return number;
}


function invalidReference(
  res: Response,
  message: string,
): void {
  res.status(400).json({
    error: {
      code: "INVALID_REFERENCE",
      message,
    },
  });
}

export async function getAyah(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const surah = parseInteger(req.params.surah, 1, 114);
    const ayah = parseInteger(req.params.ayah, 1, 286);

    if (surah === null || ayah === null) {
      invalidReference(res, "Invalid surah or ayah number.");
      return;
    }

    await respondWithCache(
      res,
      `quran:ayah:${surah}:${ayah}`,
      () => fetchAyah(surah, ayah),
    );
  } catch (error) {
    next(error);
  }
}

export async function getSurahs(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await respondWithCache(
      res,
      "quran:surahs",
      fetchSurahs,
    );
  } catch (error) {
    next(error);
  }
}

export async function getSurah(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const number = parseInteger(req.params.number, 1, 114);

    if (number === null) {
      invalidReference(res, "Surah number must be between 1 and 114.");
      return;
    }

    await respondWithCache(
      res,
      `quran:surah:${number}`,
      () => fetchSurah(number),
    );
  } catch (error) {
    next(error);
  }
}

export async function getPage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const number = parseInteger(req.params.number, 1, 604);

    if (number === null) {
      invalidReference(res, "Page number must be between 1 and 604.");
      return;
    }

    await respondWithCache(
      res,
      `quran:page:${number}`,
      () => fetchPage(number),
    );
  } catch (error) {
    next(error);
  }
}


const ALLOWED_TRANSLATIONS = [
  "sahih_international",
  "pickthall",
  "yusuf_ali",
  "urdu",
  "turkish",
  "indonesian",
  "french",
  "german",
  "bengali",
  "spanish",
  "malay",
  "bosnian",
  "all",
];

export async function searchQuranController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query.q;
    const translationParam = req.query.translation;
    const limitParam = req.query.limit;

    if (typeof query !== "string" || !query.trim()) {
      res.status(400).json({
        error: {
          code: "INVALID_QUERY",
          message: "The q parameter is required.",
        },
      });
      return;
    }

    if (query.trim().length > 100) {
      res.status(400).json({
        error: {
          code: "INVALID_QUERY",
          message: "The search query must not exceed 100 characters.",
        },
      });
      return;
    }

    const translation =
      translationParam === undefined
        ? "sahih_international"
        : translationParam;

    if (
      typeof translation !== "string" ||
      !ALLOWED_TRANSLATIONS.includes(translation)
    ) {
      res.status(400).json({
        error: {
          code: "INVALID_TRANSLATION",
          message: "Unsupported translation.",
        },
      });
      return;
    }

    let limit = 25;

    if (limitParam !== undefined) {
      if (
        typeof limitParam !== "string" ||
        !/^\d+$/.test(limitParam)
      ) {
        res.status(400).json({
          error: {
            code: "INVALID_LIMIT",
            message: "Limit must be an integer between 1 and 50.",
          },
        });
        return;
      }

      limit = Number(limitParam);

      if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
        res.status(400).json({
          error: {
            code: "INVALID_LIMIT",
            message: "Limit must be between 1 and 50.",
          },
        });
        return;
      }
    }

    const normalizedQuery = query.trim();
    const cacheKey =
      `quran:search:${translation}:${limit}:${normalizedQuery.toLowerCase()}`;

    await respondWithCache(res, cacheKey, () =>
      searchQuran(normalizedQuery, translation, limit),
    );
  } catch (error) {
    next(error);
  }
}
