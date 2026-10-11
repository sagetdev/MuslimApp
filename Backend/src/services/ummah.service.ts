
import { z } from "zod";

const BASE_URL = "https://ummahapi.com";
const TIMEOUT_MS = 15_000;

const envelopeSchema = z.object({
  success: z.literal(true),
  data: z.unknown(),
});

export class UmmahApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "UmmahApiError";
  }
}

async function fetchData(path: string): Promise<unknown> {
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new UmmahApiError(
      "UmmahAPI is temporarily unavailable.",
      503,
    );
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new UmmahApiError("Resource not found.", 404);
    }

    if (response.status === 429) {
      throw new UmmahApiError(
        "UmmahAPI rate limit reached. Try again later.",
        503,
      );
    }

    throw new UmmahApiError(
      `UmmahAPI returned HTTP ${response.status}.`,
      502,
    );
  }

  let body: unknown;

  try {
    body = await response.json();
  } catch {
    throw new UmmahApiError(
      "UmmahAPI returned invalid JSON.",
      502,
    );
  }

  const parsed = envelopeSchema.safeParse(body);

  if (!parsed.success) {
    throw new UmmahApiError(
      "Unexpected response format from UmmahAPI.",
      502,
    );
  }

  return parsed.data.data;
}

export function fetchAyah(
  surah: number,
  ayah: number,
): Promise<unknown> {
  return fetchData(`/api/quran/surah/${surah}/ayah/${ayah}`);
}

export function fetchSurahs(): Promise<unknown> {
  return fetchData("/api/quran/surahs");
}

export function fetchSurah(
  number: number,
): Promise<unknown> {
  return fetchData(`/api/quran/surah/${number}`);
}

export function fetchPage(
  number: number,
): Promise<unknown> {
  return fetchData(`/api/quran/page/${number}`);
}


export function searchQuran(
  query: string,
  translation: string,
  limit: number,
): Promise<unknown> {
  const params = new URLSearchParams({
    q: query,
    translation,
    limit: String(limit),
  });

  return fetchData(`/api/quran/search?${params.toString()}`);
}


export function fetchUmmahPath(path: string): Promise<unknown> {
  // Les chemins sont construits par notre backend, jamais fournis
  // directement comme URL par le client.
  return fetchData(path);
}
