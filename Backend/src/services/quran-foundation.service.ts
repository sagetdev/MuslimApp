import { z } from "zod";
import { env } from "../config/env.js";
import { getCache, setCache } from "../lib/cache.js";
import { UmmahApiError } from "./ummah.service.js";

const HOSTS = {
  prelive: {
    auth: "https://prelive-oauth2.quran.foundation",
    api: "https://apis-prelive.quran.foundation",
  },
  production: {
    auth: "https://oauth2.quran.foundation",
    api: "https://apis.quran.foundation",
  },
} as const;

const TIMEOUT_MS = 15_000;

const tokenSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
});

const chaptersSchema = z.object({
  chapters: z.array(z.object({ id: z.number(), name_arabic: z.string() })),
});

const pageSchema = z.object({
  verses: z.array(
    z.object({
      verse_key: z.string(),
      verse_number: z.number(),
      words: z.array(
        z.object({
          line_number: z.number(),
          page_number: z.number(),
          char_type_name: z.string(),
          code_v2: z.string().nullish(),
          text_qpc_hafs: z.string().nullish(),
        }),
      ),
    }),
  ),
});

export type MushafWord = {
  code: string | null;
  text: string | null;
  kind: "word" | "end";
  page: number;
};

export type MushafHeader = { type: "banner"; name: string } | { type: "bismillah" };

let token: { value: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (token && token.expiresAt > Date.now() + 60_000) return token.value;

  if (!env.QF_CLIENT_ID || !env.QF_CLIENT_SECRET) {
    throw new UmmahApiError("Quran Foundation credentials are not configured.", 503);
  }

  const basic = Buffer.from(`${env.QF_CLIENT_ID}:${env.QF_CLIENT_SECRET}`).toString("base64");

  let response: Response;

  try {
    response = await fetch(`${HOSTS[env.QF_ENV].auth}/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ grant_type: "client_credentials", scope: "content" }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new UmmahApiError("Quran Foundation auth is temporarily unavailable.", 503);
  }

  if (!response.ok) {
    throw new UmmahApiError("Quran Foundation authentication failed.", 502);
  }

  const parsed = tokenSchema.safeParse(await response.json().catch(() => null));

  if (!parsed.success) {
    throw new UmmahApiError("Unexpected auth response from Quran Foundation.", 502);
  }

  token = {
    value: parsed.data.access_token,
    expiresAt: Date.now() + parsed.data.expires_in * 1000,
  };

  return token.value;
}

async function qfGet(path: string, retry = true): Promise<unknown> {
  const accessToken = await getToken();

  let response: Response;

  try {
    response = await fetch(`${HOSTS[env.QF_ENV].api}/content/api/v4${path}`, {
      headers: {
        Accept: "application/json",
        "x-auth-token": accessToken,
        "x-client-id": env.QF_CLIENT_ID as string,
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new UmmahApiError("Quran Foundation API is temporarily unavailable.", 503);
  }

  if (response.status === 401 && retry) {
    token = null;
    return qfGet(path, false);
  }

  if (!response.ok) {
    throw new UmmahApiError(
      `Quran Foundation API returned HTTP ${response.status}.`,
      response.status === 404 ? 404 : 502,
    );
  }

  try {
    return await response.json();
  } catch {
    throw new UmmahApiError("Quran Foundation API returned invalid JSON.", 502);
  }
}

async function getChapterNames(): Promise<Record<number, string>> {
  const cached = getCache<Record<number, string>>("qf:chapters");

  if (cached) return cached;

  const parsed = chaptersSchema.safeParse(await qfGet("/chapters"));

  if (!parsed.success) return {};

  const names: Record<number, string> = {};

  for (const chapter of parsed.data.chapters) names[chapter.id] = chapter.name_arabic;

  setCache("qf:chapters", names, 30 * 24 * 60 * 60 * 1000);

  return names;
}

export async function fetchMushafPage(page: number) {
  const [raw, names] = await Promise.all([
    qfGet(
      `/verses/by_page/${page}?mushaf=1&words=true&per_page=50` +
        "&word_fields=code_v2,text_qpc_hafs,line_number,page_number",
    ),
    getChapterNames(),
  ]);

  const parsed = pageSchema.safeParse(raw);

  if (!parsed.success) {
    throw new UmmahApiError("Unexpected response format from Quran Foundation.", 502);
  }

  const lines = new Map<number, MushafWord[]>();
  const headers: Record<number, MushafHeader> = {};

  for (const verse of parsed.data.verses) {
    const first = verse.words[0];

    if (verse.verse_number === 1 && first) {
      const chapter = Number(verse.verse_key.split(":")[0]);
      const name = names[chapter] ?? "";
      const line = first.line_number;

      if (chapter === 1 || chapter === 9) {
        if (line - 1 >= 1) headers[line - 1] = { type: "banner", name };
      } else {
        if (line - 1 >= 1) headers[line - 1] = { type: "bismillah" };
        if (line - 2 >= 1) headers[line - 2] = { type: "banner", name };
      }
    }

    for (const word of verse.words) {
      const kind = word.char_type_name === "end" ? "end" : "word";

      if (kind === "word" && !word.code_v2) continue;

      const list = lines.get(word.line_number) ?? [];

      list.push({
        code: word.code_v2 ?? null,
        text: word.text_qpc_hafs ?? null,
        kind,
        page: word.page_number,
      });

      lines.set(word.line_number, list);
    }
  }

  return {
    page,
    lines: [...lines.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([number, words]) => ({ number, words })),
    headers,
  };
}

export async function fetchAllMushafPages(
  onProgress?: (current: number, total: number) => void,
): Promise<{ page: number; lines: { number: number; words: MushafWord[] }[]; headers: Record<number, MushafHeader> }[]> {
  const TOTAL_PAGES = 604;
  const CONCURRENCY = 8;
  const results: Awaited<ReturnType<typeof fetchMushafPage>>[] = new Array(TOTAL_PAGES);
  const pages = Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1);

  let index = 0;
  let completed = 0;

  async function worker() {
    while (true) {
      const current = index++;
      if (current >= pages.length) return;

      const page = pages[current];
      try {
        results[page - 1] = await fetchMushafPage(page);
      } catch (error) {
        // En cas d'échec sur une page, on réessaie une fois
        try {
          results[page - 1] = await fetchMushafPage(page);
        } catch {
          // On laisse la page undefined, elle sera filtrée
        }
      }
      completed++;
      onProgress?.(completed, TOTAL_PAGES);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // Filtre les pages manquantes + tri final
  return results.filter((p): p is NonNullable<typeof p> => p != null);
}