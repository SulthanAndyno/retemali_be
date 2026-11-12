/**
 * Server-side helper for talking to the Rete Mali REST API from Next.js route
 * handlers. Keeps the upstream base URL and bearer-token forwarding in one
 * place so every report endpoint behaves the same way.
 */

const API_BASE = (
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:5000/api'
).replace(/\/$/, '');

export interface UpstreamResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
}

export interface UpstreamOptions {
  token?: string | null;
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  timeoutMs?: number;
}

/** Extracts the bearer token from an incoming request. */
export function bearerToken(request: Request): string | null {
  const header = request.headers.get('authorization');
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : header.trim() || null;
}

export function upstreamUrl(path: string): string {
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * The API compares timestamps, so a date-only upper bound (`2026-11-11`) would
 * exclude everything after midnight. Expand it to the end of that day.
 */
export function endOfDayIso(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.length > 10 ? value : `${value}T23:59:59.999`;
}

export async function upstreamRequest<T = unknown>(
  path: string,
  options: UpstreamOptions = {}
): Promise<UpstreamResult<T>> {
  const { token, method = 'GET', body, timeoutMs = 15000 } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(upstreamUrl(path), {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined && method !== 'GET' ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      cache: 'no-store',
    });

    const text = await response.text();
    let parsed: unknown = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }
    }

    if (!response.ok) {
      const payload = parsed as { message?: string } | null;
      return {
        ok: false,
        status: response.status,
        data: null,
        error:
          payload?.message ??
          (response.status === 401
            ? 'Sesi Anda berakhir. Silakan masuk kembali.'
            : response.status === 403
              ? 'Anda tidak memiliki akses ke data ini.'
              : `Permintaan ke server gagal (HTTP ${response.status}).`),
      };
    }

    return { ok: true, status: response.status, data: (parsed as T) ?? null, error: null };
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'AbortError'
        ? 'Server tidak merespons tepat waktu. Coba lagi.'
        : 'Tidak dapat menghubungi server Rete Mali.';
    return { ok: false, status: 0, data: null, error: message };
  } finally {
    clearTimeout(timeout);
  }
}

/** Standard JSON envelope used by every route handler in this app. */
export function jsonOk<T>(data: T, init?: ResponseInit): Response {
  return Response.json({ status: 'success', data }, init);
}

export function jsonError(message: string, status = 500): Response {
  return Response.json({ status: 'error', message }, { status });
}
