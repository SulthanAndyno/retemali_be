import type { NextRequest } from 'next/server';
import { bearerToken, jsonError, jsonOk, upstreamRequest } from '@/lib/serverUpstream';
import { computeEventTimeline, computeQuotaState } from '@/lib/events';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface UpstreamEvent {
  id: string;
  title: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  quota: number;
  registeredCount: number;
  status: string;
}

/**
 * GET /api/events/auto-close
 * Server-side evaluation of every event's timeline. Returns the derived phase
 * (including automatic closure once the end time has passed) so the UI never
 * has to trust a stale `status` column.
 */
export async function GET(request: NextRequest) {
  const token = bearerToken(request);
  const upstream = await upstreamRequest<{ data: UpstreamEvent[] }>('/events?limit=100', {
    token,
  });

  if (!upstream.ok) {
    return jsonError(
      upstream.error ?? 'Gagal mengevaluasi status kegiatan.',
      upstream.status || 502
    );
  }

  const now = new Date();
  const events = (upstream.data?.data ?? []).map((event) => {
    const timeline = computeEventTimeline(event, now);
    const quota = computeQuotaState(event.quota, event.registeredCount);

    return {
      id: event.id,
      title: event.title,
      phase: timeline.phase,
      label: timeline.label,
      isRegistrationOpen: timeline.isRegistrationOpen,
      isAutoClosed: timeline.isAutoClosed,
      closedReason: timeline.closedReason,
      startsAt: timeline.startsAt ? timeline.startsAt.toISOString() : null,
      endsAt: timeline.endsAt ? timeline.endsAt.toISOString() : null,
      quota: quota.quota,
      registeredCount: quota.registered,
      seatsLeft: quota.seatsLeft,
      isQuotaFull: quota.isFull,
      quotaPercent: quota.percent,
    };
  });

  return jsonOk({ evaluatedAt: now.toISOString(), events });
}
