const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('retemali_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
}

export async function apiRequest<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>
): Promise<T> {
  const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    ...getAuthHeaders(),
    ...extraHeaders,
  };

  const config: RequestInit = {
    method,
    headers,
  };

  if (body !== undefined && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(url, config);

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  if (!response.ok) {
    const errorData = data as { message?: string };
    throw new Error(errorData?.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return data as T;
}

export function get<T = unknown>(path: string, headers?: Record<string, string>): Promise<T> {
  return apiRequest<T>('GET', path, undefined, headers);
}

export function post<T = unknown>(
  path: string,
  body?: unknown,
  headers?: Record<string, string>
): Promise<T> {
  return apiRequest<T>('POST', path, body, headers);
}

export function patch<T = unknown>(
  path: string,
  body?: unknown,
  headers?: Record<string, string>
): Promise<T> {
  return apiRequest<T>('PATCH', path, body, headers);
}

export function del<T = unknown>(path: string, headers?: Record<string, string>): Promise<T> {
  return apiRequest<T>('DELETE', path, undefined, headers);
}
