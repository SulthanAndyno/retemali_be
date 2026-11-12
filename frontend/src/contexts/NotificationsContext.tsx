'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { ActivityNotification, NotificationFeed } from '@/lib/notifications';

interface NotificationsContextValue {
  items: ActivityNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  auditLogAvailable: boolean;
  lastFetchedAt: string | null;
  refresh: () => Promise<void>;
  markRead: (id: string) => void;
  markAllRead: () => void;
  isRead: (id: string) => boolean;
  resetReadState: () => void;
  toast: ActivityNotification | null;
  dismissToast: () => void;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

const READ_KEY = 'retemali_notif_read_ids';
const POLL_INTERVAL_MS = 60_000;
const MAX_READ_IDS = 300;

function loadReadIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(READ_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function persistReadIds(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(READ_KEY, JSON.stringify(ids.slice(0, MAX_READ_IDS)));
  } catch {
    // Storage full / disabled — read state simply falls back to in-memory.
  }
}

/**
 * Polls the activity feed and tracks which entries the user has already seen.
 * Read state is stored per-browser (localStorage) because there is no
 * notification/read-receipt table in the schema to persist it server-side.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [items, setItems] = useState<ActivityNotification[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auditLogAvailable, setAuditLogAvailable] = useState(true);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);
  const [toast, setToast] = useState<ActivityNotification | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const knownIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setReadIds(loadReadIds());
  }, []);

  const refresh = useCallback(async () => {
    if (!user) return;
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('retemali_token') : null;
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });

      const payload = (await response.json().catch(() => null)) as
        | { status?: string; message?: string; data?: NotificationFeed }
        | null;

      if (!response.ok || !payload?.data) {
        throw new Error(payload?.message ?? 'Gagal memuat notifikasi aktivitas.');
      }

      const feed = payload.data;
      const incoming = feed.items ?? [];

      const fresh = incoming.filter((item) => !knownIdsRef.current.has(item.id));
      const hadPrevious = knownIdsRef.current.size > 0;
      incoming.forEach((item) => knownIdsRef.current.add(item.id));

      setItems(incoming);
      setAuditLogAvailable(feed.auditLogAvailable !== false);
      setLastFetchedAt(feed.fetchedAt ?? new Date().toISOString());

      if (hadPrevious && fresh.length > 0) {
        setToast(fresh[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat notifikasi aktivitas.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      knownIdsRef.current = new Set();
      return;
    }

    refresh();

    const interval = window.setInterval(refresh, POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user, refresh]);

  const visibleItems = useMemo(() => (user ? items : []), [user, items]);

  const unreadCount = useMemo(
    () => visibleItems.filter((item) => !readIds.includes(item.id)).length,
    [visibleItems, readIds]
  );

  const markRead = useCallback((id: string) => {
    setReadIds((previous) => {
      if (previous.includes(id)) return previous;
      const next = [id, ...previous].slice(0, MAX_READ_IDS);
      persistReadIds(next);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setReadIds((previous) => {
      const next = Array.from(new Set([...items.map((item) => item.id), ...previous])).slice(
        0,
        MAX_READ_IDS
      );
      persistReadIds(next);
      return next;
    });
  }, [items]);

  const resetReadState = useCallback(() => {
    setReadIds([]);
    persistReadIds([]);
  }, []);

  const isRead = useCallback((id: string) => readIds.includes(id), [readIds]);

  const dismissToast = useCallback(() => setToast(null), []);

  const value: NotificationsContextValue = {
    items: visibleItems,
    unreadCount,
    loading,
    error,
    auditLogAvailable,
    lastFetchedAt,
    refresh,
    markRead,
    markAllRead,
    isRead,
    resetReadState,
    toast,
    dismissToast,
    panelOpen,
    setPanelOpen,
  };

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsContextValue {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}
