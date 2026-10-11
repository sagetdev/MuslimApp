import type { NextFunction, Request, Response } from "express";
import { getCache, setCache } from "../lib/cache.js";
import {
  fetchMushafPage,
  fetchAllMushafPages,
} from "../services/quran-foundation.service.js";

/**
 * GET /api/mushaf/pages/:number
 * Renvoie une page du mushaf (1..604).
 */
export async function getMushafPage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const raw = req.params.number;
    const number = typeof raw === "string" && /^\d+$/.test(raw) ? Number(raw) : NaN;

    if (!Number.isInteger(number) || number < 1 || number > 604) {
      res.status(400).json({
        error: {
          code: "INVALID_REFERENCE",
          message: "Page number must be between 1 and 604.",
        },
      });
      return;
    }

    const key = `mushaf:page:${number}`;
    const cached = getCache<unknown>(key);

    if (cached !== undefined) {
      res.setHeader("X-Cache", "HIT");
      res.status(200).json({ data: cached });
      return;
    }

    const data = await fetchMushafPage(number);

    setCache(key, data, 24 * 60 * 60 * 1000);

    res.setHeader("X-Cache", "MISS");
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/mushaf/all-pages
 * Renvoie les 604 pages du mushaf en une seule réponse.
 * Utilisé par le client pour télécharger tout le Coran d'un coup.
 */
export async function getAllMushafPages(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const CACHE_KEY = "mushaf:all-pages:v1";
    const cached = getCache<unknown>(CACHE_KEY);

    if (cached !== undefined) {
      res.setHeader("X-Cache", "HIT");
      res.setHeader("Cache-Control", "public, max-age=604800, immutable");
      res.status(200).json({
        version: 1,
        count: (cached as unknown[]).length,
        pages: cached,
      });
      return;
    }

    const pages = await fetchAllMushafPages((current, total) => {
      if (current % 50 === 0 || current === total) {
        console.log(`[mushaf/all-pages] ${current}/${total} pages fetched`);
      }
    });

    // Cache 30 jours (le Coran ne change pas)
    setCache(CACHE_KEY, pages, 30 * 24 * 60 * 60 * 1000);

    res.setHeader("X-Cache", "MISS");
    res.setHeader("Cache-Control", "public, max-age=604800, immutable");
    res.status(200).json({
      version: 1,
      generatedAt: new Date().toISOString(),
      count: pages.length,
      pages,
    });
  } catch (error) {
    next(error);
  }
}