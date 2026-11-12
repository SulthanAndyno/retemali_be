/**
 * Notification model shared by the API route and the header bell UI.
 */

export type NotificationKind = 'AUDIT' | 'EVENT' | 'EVENT_CLOSED';
export type NotificationSeverity = 'info' | 'success' | 'warning';

export interface ActivityNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  description: string;
  createdAt: string;
  severity: NotificationSeverity;
  href: string | null;
}

export interface NotificationFeed {
  items: ActivityNotification[];
  auditLogAvailable: boolean;
  fetchedAt: string;
}

export const SEVERITY_STYLES: Record<NotificationSeverity, { dot: string; badge: string }> = {
  info: { dot: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700' },
  success: { dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
  warning: { dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-800' },
};

/** "baru saja", "5 menit lalu", "3 jam lalu", "2 hari lalu". */
export function formatRelativeTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '-';

  const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSeconds < 60) return 'baru saja';
  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} bulan lalu`;
  return `${Math.floor(months / 12)} tahun lalu`;
}
