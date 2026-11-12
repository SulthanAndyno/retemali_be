import type { NextRequest } from 'next/server';
import { bearerToken, jsonError, jsonOk, upstreamRequest } from '@/lib/serverUpstream';
import { computeEventTimeline } from '@/lib/events';
import { formatDateId } from '@/lib/reports';
import type { ActivityNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface UpstreamAuditLog {
  id: string;
  title: string;
  description: string;
  category: string;
  createdAt: string;
}

interface UpstreamEvent {
  id: string;
  title: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  quota: number;
  registeredCount: number;
  status: string;
  createdAt: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function severityForCategory(category: string): ActivityNotification['severity'] {
  const value = (category ?? '').toUpperCase();
  if (value.includes('DONASI')) return 'success';
  if (value.includes('SIRKULASI') || value.includes('PINJAM') || value.includes('DENDA')) {
    return 'warning';
  }
  if (value.includes('RELAWAN') || value.includes('EVENT') || value.includes('KEGIATAN')) {
    return 'info';
  }
  return 'info';
}

/**
 * GET /api/notifications
 * Activity-log feed for the header bell: newest audit entries, newly created
 * events, and events that were auto-closed by the timeline.
 */
export async function GET(request: NextRequest) {
  const token = bearerToken(request);
  if (!token) {
    return jsonError('Token autentikasi tidak ditemukan. Silakan masuk kembali.', 401);
  }

  const [auditResult, eventsResult] = await Promise.all([
    upstreamRequest<{ data: UpstreamAuditLog[] }>('/audit-logs?limit=15', { token }),
    upstreamRequest<{ data: UpstreamEvent[] }>('/events?limit=30', { token }),
  ]);

  if (!auditResult.ok && !eventsResult.ok) {
    return jsonError(
      eventsResult.error ?? auditResult.error ?? 'Gagal memuat notifikasi aktivitas.',
      eventsResult.status || auditResult.status || 502
    );
  }

  const now = new Date();
  const items: ActivityNotification[] = [];

  if (auditResult.ok) {
    for (const log of auditResult.data?.data ?? []) {
      items.push({
        id: `audit-${log.id}`,
        kind: 'AUDIT',
        title: log.title,
        description: log.description,
        createdAt: log.createdAt,
        severity: severityForCategory(log.category),
        href: null,
      });
    }
  }

  for (const event of eventsResult.ok ? (eventsResult.data?.data ?? []) : []) {
    const createdAt = new Date(event.createdAt);
    const isNew = !Number.isNaN(createdAt.getTime()) && now.getTime() - createdAt.getTime() <= 14 * DAY_MS;

    if (isNew) {
      items.push({
        id: `event-${event.id}`,
        kind: 'EVENT',
        title: `Kegiatan baru: ${event.title}`,
        description: `${formatDateId(event.eventDate)} • ${event.startTime}-${event.endTime} WIB • ${event.registeredCount}/${event.quota} peserta terdaftar`,
        createdAt: event.createdAt,
        severity: 'info',
        href: '/kegiatan',
      });
    }

    const timeline = computeEventTimeline(event, now);
    const endsAt = timeline.endsAt;
    const recentlyEnded =
      timeline.isAutoClosed &&
      endsAt !== null &&
      now.getTime() - endsAt.getTime() <= 7 * DAY_MS;

    if (recentlyEnded) {
      items.push({
        id: `event-closed-${event.id}`,
        kind: 'EVENT_CLOSED',
        title: `Kegiatan ditutup otomatis: ${event.title}`,
        description:
          'Waktu pelaksanaan berakhir. Pendaftaran ditutup otomatis — lengkapi laporan presensi kegiatan.',
        createdAt: endsAt.toISOString(),
        severity: 'warning',
        href: '/dashboard/admin/reports/attendance',
      });
    }
  }

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return jsonOk({
    items: items.slice(0, 25),
    auditLogAvailable: auditResult.ok,
    fetchedAt: now.toISOString(),
  });
}
