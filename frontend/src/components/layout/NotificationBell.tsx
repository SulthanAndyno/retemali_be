'use client';

import { useRouter } from 'next/navigation';
import {
  Bell,
  CalendarClock,
  CheckCheck,
  ChevronRight,
  RefreshCw,
  X,
} from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationsContext';
import { SEVERITY_STYLES, formatRelativeTime } from '@/lib/notifications';

/**
 * Header bell: unread badge, activity dropdown, and the "new activity" toast.
 */
export default function NotificationBell() {
  const router = useRouter();
  const {
    items,
    unreadCount,
    loading,
    error,
    auditLogAvailable,
    lastFetchedAt,
    refresh,
    markRead,
    markAllRead,
    isRead,
    toast,
    dismissToast,
    panelOpen,
    setPanelOpen,
  } = useNotifications();

  const handleOpen = () => {
    setPanelOpen(!panelOpen);
  };

  const handleItemClick = (id: string, href: string | null) => {
    markRead(id);
    if (href) {
      setPanelOpen(false);
      router.push(href);
    }
  };

  return (
    <>
      {/* Live "new activity logged" toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[110] w-[calc(100%-2rem)] max-w-sm">
          <div className="flex items-start gap-2 bg-slate-900 text-white rounded-xl shadow-lg px-3.5 py-3">
            <span
              className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                SEVERITY_STYLES[toast.severity].dot
              }`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-300">
                Aktivitas baru tercatat
              </p>
              <p className="text-xs font-semibold truncate">{toast.title}</p>
              <p className="text-[11px] text-slate-300 line-clamp-2">{toast.description}</p>
            </div>
            <button
              onClick={dismissToast}
              className="text-slate-400 hover:text-white shrink-0"
              aria-label="Tutup notifikasi"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="relative">
        <button
          onClick={handleOpen}
          className="p-2 text-slate-600 hover:text-blue-600 rounded-full hover:bg-slate-100 relative transition-colors"
          aria-label={`Notifikasi${unreadCount > 0 ? ` (${unreadCount} belum dibaca)` : ''}`}
          aria-expanded={panelOpen}
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {panelOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-slate-900/10"
              onClick={() => setPanelOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden">
              <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100">
                <div>
                  <p className="text-xs font-bold text-slate-900">Notifikasi Aktivitas</p>
                  <p className="text-[10px] text-slate-500">
                    {unreadCount > 0 ? `${unreadCount} belum dibaca` : 'Semua sudah dibaca'}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={markAllRead}
                    disabled={unreadCount === 0}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                    aria-label="Tandai semua sudah dibaca"
                    title="Tandai semua sudah dibaca"
                  >
                    <CheckCheck size={15} />
                  </button>
                  <button
                    onClick={() => refresh()}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                    aria-label="Muat ulang notifikasi"
                    title="Muat ulang"
                  >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {loading && items.length === 0 && (
                  <div className="p-3 space-y-2">
                    {[...Array(3)].map((_, index) => (
                      <div key={index} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
                    ))}
                  </div>
                )}

                {!loading && error && (
                  <p className="text-[11px] text-rose-600 px-3.5 py-4 text-center">{error}</p>
                )}

                {!loading && !error && items.length === 0 && (
                  <p className="text-[11px] text-slate-400 px-3.5 py-6 text-center">
                    Belum ada aktivitas tercatat.
                  </p>
                )}

                {items.map((item) => {
                  const styles = SEVERITY_STYLES[item.severity];
                  const unread = !isRead(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item.id, item.href)}
                      className={`w-full text-left px-3.5 py-2.5 border-b border-slate-50 hover:bg-slate-50 transition-colors flex items-start gap-2 ${
                        unread ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <span
                        className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                          unread ? styles.dot : 'bg-slate-200'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`text-[11px] leading-snug line-clamp-2 ${
                              unread ? 'font-bold text-slate-900' : 'font-medium text-slate-600'
                            }`}
                          >
                            {item.title}
                          </p>
                          <span className="text-[9px] text-slate-400 whitespace-nowrap">
                            {formatRelativeTime(item.createdAt)}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-snug line-clamp-2 mt-0.5">
                          {item.description}
                        </p>
                      </div>
                      {item.href && (
                        <ChevronRight size={13} className="text-slate-300 mt-1 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="px-3.5 py-2 bg-slate-50 flex items-center justify-between">
                <span className="text-[9px] text-slate-500 flex items-center gap-1">
                  <CalendarClock size={11} />
                  {lastFetchedAt
                    ? `Diperbarui ${formatRelativeTime(lastFetchedAt)}`
                    : 'Memuat...'}
                </span>
                {!auditLogAvailable && (
                  <span className="text-[9px] text-amber-700 font-semibold">
                    Log audit terbatas
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
