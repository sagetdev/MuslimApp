import type { NextFunction, Request, Response } from "express";
import { getCache, setCache } from "../lib/cache.js";
import { fetchMushafPage } from "../services/quran-foundation.service.js";

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