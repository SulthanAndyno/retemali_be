'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { get } from '@/lib/api';

interface UseApiOptions {
  deps?: unknown[];
  skip?: boolean;
}

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useApi<T = unknown>(
  url: string,
  options?: UseApiOptions
): UseApiResult<T> {
  const { deps = [], skip = false } = options ?? {};

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState<string | null>(null);

  // Keep a stable ref for the fetch counter to allow cancellation of stale requests
  const fetchIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    if (skip) return;

    const currentId = ++fetchIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const result = await get<T>(url);
      if (currentId === fetchIdRef.current) {
        setData(result);
      }
    } catch (err: unknown) {
      if (currentId === fetchIdRef.current) {
        const message =
          err instanceof Error ? err.message : 'Terjadi kesalahan tidak terduga';
        setError(message);
      }
    } finally {
      if (currentId === fetchIdRef.current) {
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, skip, ...deps]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
