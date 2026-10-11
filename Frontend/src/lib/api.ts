const API_URL = process.env.EXPO_PUBLIC_API_URL;

type ApiFetchOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  params?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

function getApiUrl(): string {
  if (!API_URL) {
    throw new Error(
      "EXPO_PUBLIC_API_URL est manquant dans le fichier .env"
    );
  }

  return API_URL.replace(/\/+$/, "");
}

/**
 * Fonction universelle pour appeler le backend.
 *
 * Exemples :
 * apiFetch("/quran/surahs")
 * apiFetch("/quran/surahs/1")
 * apiFetch("/prayer-times", { params: { lat: 45.5, lng: -73.6 } })
 * apiFetch("/hadith/random")
 * apiFetch("/duas", { method: "GET" })
 */

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
  } = options;

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

  const response = await fetch(url.toString(), {
    method,
    headers: {
      Accept: "application/json",
      ...(body !== undefined
        ? { "Content-Type": "application/json" }
        : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    ...(signal ? { signal } : {}),
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => "");

    let message = responseText;

    try {
      const parsed = JSON.parse(responseText);
      message =
        parsed.message ??
        parsed.error ??
        parsed.detail ??
        responseText;
    } catch {
    }

    throw new Error(
      `Erreur API ${response.status}${
        message ? ` : ${message}` : ""
      }`
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

/**
 * Alias pratique si ton ancien code utilise apiGet().
 */
export async function apiGet<T = unknown>(
  endpoint: string
): Promise<T> {
  return apiFetch<T>(endpoint);
}