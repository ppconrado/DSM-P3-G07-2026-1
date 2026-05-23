export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8888';

type RequestInitWithJson = RequestInit & {
  json?: unknown;
};

export function extractErrorMessage(responseText: string, status: number) {
  const trimmedText = responseText.trim();

  if (!trimmedText) {
    return `Request failed with status ${status}`;
  }

  try {
    const parsed = JSON.parse(trimmedText) as unknown;

    if (typeof parsed === 'string') {
      return parsed;
    }

    if (parsed && typeof parsed === 'object') {
      const errorObject = parsed as Record<string, unknown>;

      const messageCandidates = [
        errorObject.error,
        errorObject.message,
        errorObject.detail,
        errorObject.details,
      ];

      for (const candidate of messageCandidates) {
        if (typeof candidate === 'string' && candidate.trim()) {
          return candidate.trim();
        }

        if (
          candidate &&
          typeof candidate === 'object' &&
          'message' in candidate &&
          typeof (candidate as Record<string, unknown>).message === 'string'
        ) {
          return (candidate as Record<string, unknown>).message as string;
        }
      }
    }
  } catch {
    // fall back to the raw text below
  }

  return trimmedText;
}

function normalizeApiValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(normalizeApiValue) as T;
  }

  if (value && typeof value === 'object') {
    const normalized = Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(
        ([key, entryValue]) => [key, normalizeApiValue(entryValue)],
      ),
    ) as Record<string, unknown>;

    if (
      Object.prototype.hasOwnProperty.call(normalized, '_id') &&
      !Object.prototype.hasOwnProperty.call(normalized, 'id')
    ) {
      normalized.id = normalized._id;
      delete normalized._id;
    }

    return normalized as T;
  }

  return value;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInitWithJson = {},
): Promise<T> {
  const headers = new Headers(init.headers);

  if (init.json !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  async function doFetch(): Promise<Response> {
    return fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      credentials: 'include',
      body: init.json === undefined ? init.body : JSON.stringify(init.json),
    });
  }

  let response = await doFetch();

  // If access token expired, try to refresh once and retry the original request
  if (response.status === 401) {
    try {
      const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (refreshRes.ok) {
        response = await doFetch();
      }
    } catch {
      // ignore refresh errors and fallthrough to handle as failure
    }
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(extractErrorMessage(message, response.status));
  }

  return normalizeApiValue((await response.json()) as T);
}
