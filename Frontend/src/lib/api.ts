// src/lib/api.ts
import { httpSemaphore, type Priority } from "./concurrency";
import { getCachedPage, setCachedPage } from "./quranCache";
import { getOfflinePage } from "./quranOffline";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

// ---------- Déduplication ----------
const inflight = new Map<string, Promise<unknown>>();

// ---------- Config ----------
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_RETRIES = 2;

type ApiFetchOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  params?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Force à ignorer la lecture du cache. */
  noCache?: boolean;
  /** Force à ne pas écrire dans le cache après le fetch. */
  noStore?: boolean;
  /** Priorité dans la file d'attente (défaut: "normal"). */
  priority?: Priority;
  /** Timeout en ms (défaut: 15000). */
  timeoutMs?: number;
  /** Nombre de retry en cas d'échec réseau/5xx (défaut: 2). */
  retries?: number;
};

function getApiUrl(): string {
  if (!API_URL) {
    throw new Error("EXPO_PUBLIC_API_URL est manquant dans le fichier .env");
  }
  return API_URL.replace(/\/+$/, "");
}

function parseMushafPage(endpoint: string): number | null {
  const match = endpoint.match(/\/mushaf\/pages\/(\d+)/);
  return match ? Number(match[1]) : null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch avec timeout + retry exponentiel.
 * - Retry sur erreurs réseau et réponses 5xx.
 * - Pas de retry sur 4xx (erreur côté client, inutile de réessayer).
 */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries: number,
  timeoutMs: number,
  externalSignal?: AbortSignal
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    // Si un signal externe est fourni, on l'écoute aussi
    const onExternalAbort = () => controller.abort();
    externalSignal?.addEventListener("abort", onExternalAbort);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      clearTimeout(timer);
      externalSignal?.removeEventListener("abort", onExternalAbort);

      // 5xx : erreur serveur → on retente
      if (response.status >= 500 && attempt < retries) {
        await sleep(500 * Math.pow(2, attempt));
        continue;
      }

      return response;
    } catch (error) {
      clearTimeout(timer);
      externalSignal?.removeEventListener("abort", onExternalAbort);
      lastError = error;

      // Si l'annulation vient du signal externe, on ne retente pas
      if (externalSignal?.aborted) throw error;

      if (attempt < retries) {
        await sleep(500 * Math.pow(2, attempt));
        continue;
      }
    }
  }

  throw lastError ?? new Error("Échec après plusieurs tentatives");
}

export async function apiFetch<T = unknown>(
  endpoint: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const {
    method = "GET",
    params,
    body,
    headers = {},
    signal,
    noCache = false,
    noStore = false,
    priority = "normal",
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
  } = options;

  const pageNumber = method === "GET" ? parseMushafPage(endpoint) : null;

  // ---------- 1. Lecture cache ----------
  if (pageNumber !== null && !noCache) {
    const offline = await getOfflinePage<T>(pageNumber);
    if (offline) return offline;

    const cached = await getCachedPage<T>(pageNumber);
    if (cached) return cached;
  }

  // ---------- 2. Construction de l'URL ----------
  const baseUrl = getApiUrl();
  const cleanEndpoint = endpoint.replace(/^\/+/, "");
  const url = new URL(`${baseUrl}/${cleanEndpoint}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  // ---------- 3. Déduplication ----------
  const dedupKey =
    method === "GET"
      ? `${method}:${url.toString()}`
      : `${method}:${url.toString()}:${body ? JSON.stringify(body) : ""}`;

  if (method === "GET") {
    const existing = inflight.get(dedupKey);
    if (existing) return existing as Promise<T>;
  }

  // ---------- 4. Exécution (avec sémaphore + retry) ----------
  const task = (async (): Promise<T> => {
    await httpSemaphore.acquire(priority);

    try {
      const response = await fetchWithRetry(
        url.toString(),
        {
          method,
          headers: {
            Accept: "application/json",
            ...(body !== undefined
              ? { "Content-Type": "application/json" }
              : {}),
            ...headers,
          },
          ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        },
        retries,
        timeoutMs,
        signal
      );

      // Gestion erreur HTTP
      if (!response.ok) {
        const responseText = await response.text().catch(() => "");
        let message = responseText;
        try {
          const parsed = JSON.parse(responseText);
          message =
            parsed.message ?? parsed.error ?? parsed.detail ?? responseText;
        } catch {}
        throw new Error(
          `Erreur API ${response.status}${message ? ` : ${message}` : ""}`
        );
      }

      // 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      const json = (await response.json()) as T;

      // Écriture cache
      if (pageNumber !== null && !noStore) {
        await setCachedPage(pageNumber, json);
      }

      return json;
    } finally {
      httpSemaphore.release();
    }
  })();

  // Déduplication : on enregistre la promesse pour les GET
  if (method === "GET") {
    inflight.set(dedupKey, task);
    // Do not create an ignored rejected promise: `finally` would surface an unhandled rejection.
    void task.then(
      () => inflight.delete(dedupKey),
      () => inflight.delete(dedupKey)
    );
  }
  
  if (__DEV__) {
    // Dans apiFetch, juste avant `return task;`
    console.log(
        `[api] ${method} ${cleanEndpoint} priority=${priority}`,
        httpSemaphore.stats
    );
  }

  return task;
}

export async function apiGet<T = unknown>(endpoint: string): Promise<T> {
  return apiFetch<T>(endpoint);
}