import type { NextRequest } from 'next/server';
import {
  bearerToken,
  endOfDayIso,
  jsonError,
  jsonOk,
  upstreamRequest,
} from '@/lib/serverUpstream';
import {
  buildAttendanceReport,
  type ReportPeriod,
  type UpstreamAttendanceEvent,
} from '@/lib/reports';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface AttendanceUpstreamPayload {
  generatedAt: string;
  period: { from: string | null; to: string | null };
  events: UpstreamAttendanceEvent[];
}

function readReportQuery(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from') || null;
  const to = searchParams.get('to') || null;
  const eventId = searchParams.get('eventId') || null;

  const params = new URLSearchParams();
  if (from) params.set('from', from);
  const endOfDay = endOfDayIso(to);
  if (endOfDay) params.set('to', endOfDay);
  if (eventId) params.set('eventId', eventId);

  const query = params.toString();
  return { period: { from, to } as ReportPeriod, eventId, query };
}

/**
 * GET /api/reports/attendance
 * Aggregated attendance report (per event + per participant) for the admin UI.
 */
export async function GET(request: NextRequest) {
  const token = bearerToken(request);
  if (!token) {
    return jsonError('Token autentikasi tidak ditemukan. Silakan masuk kembali.', 401);
  }

  const { period, query } = readReportQuery(request);
  const upstream = await upstreamRequest<{ data: AttendanceUpstreamPayload }>(
    `/events/attendance${query ? `?${query}` : ''}`,
    { token }
  );

  if (!upstream.ok || !upstream.data?.data) {
    return jsonError(
      upstream.error ?? 'Gagal memuat laporan presensi kegiatan.',
      upstream.status || 502
    );
  }

  const report = buildAttendanceReport(upstream.data.data.events ?? [], period);
  return jsonOk(report);
}
