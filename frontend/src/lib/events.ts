/**
 * Shared event timeline + quota helpers.
 *
 * Pure functions (no server-only imports) so they can run both in the browser
 * and inside route handlers. The timeline is derived from the event's date and
 * start/end time, which is what makes "automated closing" work without a cron
 * job or a database change: an event whose end time has passed is treated as
 * closed everywhere in the UI, even before an admin flips its status.
 */

export type EventPhase =
  | 'UPCOMING'
  | 'ONGOING'
  | 'ENDED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DRAFT';

export type EventTone = 'blue' | 'emerald' | 'slate' | 'rose' | 'amber';

export interface EventLike {
  eventDate: string | Date;
  startTime?: string | null;
  endTime?: string | null;
  quota?: number | null;
  registeredCount?: number | null;
  status?: string | null;
}

export interface EventTimeline {
  phase: EventPhase;
  label: string;
  tone: EventTone;
  isRegistrationOpen: boolean;
  isAutoClosed: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  closedReason: string | null;
}

export interface QuotaState {
  quota: number;
  registered: number;
  seatsLeft: number;
  isFull: boolean;
  percent: number;
  label: string;
  tone: EventTone;
}

const TIME_PATTERN = /^(\d{1,2})[:.](\d{2})/;

function parseTime(value?: string | null): { hours: number; minutes: number } | null {
  if (!value) return null;
  const match = TIME_PATTERN.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
}

function combine(date: Date, time: string | null | undefined, fallback: Date | null): Date | null {
  const parsed = parseTime(time);
  if (!parsed) return fallback;
  const result = new Date(date.getTime());
  result.setHours(parsed.hours, parsed.minutes, 0, 0);
  return result;
}

const PHASE_META: Record<EventPhase, { label: string; tone: EventTone; open: boolean }> = {
  UPCOMING: { label: 'Akan Datang', tone: 'blue', open: true },
  ONGOING: { label: 'Sedang Berlangsung', tone: 'emerald', open: true },
  ENDED: { label: 'Selesai • Ditutup Otomatis', tone: 'slate', open: false },
  COMPLETED: { label: 'Selesai', tone: 'slate', open: false },
  CANCELLED: { label: 'Dibatalkan', tone: 'rose', open: false },
  DRAFT: { label: 'Draf', tone: 'amber', open: false },
};

/**
 * Derives the live phase of an event from its schedule, honouring explicit
 * terminal statuses (COMPLETED / CANCELLED / DRAFT) when they are present.
 */
export function computeEventTimeline(event: EventLike, now: Date = new Date()): EventTimeline {
  const rawDate = typeof event.eventDate === 'string' ? new Date(event.eventDate) : event.eventDate;
  const hasValidDate = !Number.isNaN(rawDate.getTime());
  const baseDate = hasValidDate ? rawDate : null;

  const startsAt = baseDate ? combine(baseDate, event.startTime, baseDate) : null;
  let endsAt = baseDate ? combine(baseDate, event.endTime, null) : null;

  if (startsAt && endsAt && endsAt.getTime() <= startsAt.getTime()) {
    // Session crossing midnight (e.g. 19:30 → 00:30).
    endsAt = new Date(endsAt.getTime() + 24 * 60 * 60 * 1000);
  }
  if (startsAt && !endsAt) {
    endsAt = new Date(startsAt.getTime() + 2 * 60 * 60 * 1000);
  }

  const status = (event.status ?? '').toUpperCase();

  let phase: EventPhase;
  let closedReason: string | null = null;

  if (status === 'CANCELLED') {
    phase = 'CANCELLED';
    closedReason = 'Kegiatan dibatalkan oleh panitia.';
  } else if (status === 'DRAFT') {
    phase = 'DRAFT';
    closedReason = 'Kegiatan masih berstatus draf dan belum dipublikasikan.';
  } else if (status === 'COMPLETED') {
    phase = 'COMPLETED';
    closedReason = 'Kegiatan telah ditandai selesai oleh panitia.';
  } else if (!startsAt || !endsAt) {
    phase = 'UPCOMING';
  } else if (now.getTime() > endsAt.getTime()) {
    phase = 'ENDED';
    closedReason = 'Waktu pelaksanaan telah berakhir — pendaftaran ditutup otomatis.';
  } else if (now.getTime() >= startsAt.getTime()) {
    phase = 'ONGOING';
  } else {
    phase = 'UPCOMING';
  }

  const meta = PHASE_META[phase];

  return {
    phase,
    label: meta.label,
    tone: meta.tone,
    isRegistrationOpen: meta.open,
    isAutoClosed: phase === 'ENDED',
    startsAt,
    endsAt,
    closedReason,
  };
}

/**
 * Normalises quota/registration counters into a UI-friendly state.
 */
export function computeQuotaState(
  quota?: number | null,
  registered?: number | null
): QuotaState {
  const totalQuota = Math.max(0, Number(quota ?? 0));
  const totalRegistered = Math.max(0, Number(registered ?? 0));
  const seatsLeft = Math.max(0, totalQuota - totalRegistered);
  const percent =
    totalQuota > 0 ? Math.min(100, Math.round((totalRegistered / totalQuota) * 100)) : 0;
  const isFull = totalQuota > 0 && seatsLeft === 0;

  return {
    quota: totalQuota,
    registered: totalRegistered,
    seatsLeft,
    isFull,
    percent,
    label: isFull ? 'Kuota Penuh' : `Sisa ${seatsLeft} kursi`,
    tone: isFull ? 'rose' : percent >= 80 ? 'amber' : 'emerald',
  };
}

export interface RegistrationGate {
  allowed: boolean;
  reason: string | null;
  badge: string;
}

/**
 * Single source of truth for whether the "Daftar" button should be clickable.
 */
export function getRegistrationGate(event: EventLike, now: Date = new Date()): RegistrationGate {
  const timeline = computeEventTimeline(event, now);
  const quota = computeQuotaState(event.quota, event.registeredCount);

  if (!timeline.isRegistrationOpen) {
    return {
      allowed: false,
      reason: timeline.closedReason ?? 'Pendaftaran ditutup.',
      badge: timeline.label,
    };
  }

  if (quota.isFull) {
    return {
      allowed: false,
      reason: 'Kuota peserta sudah penuh.',
      badge: 'Kuota Penuh',
    };
  }

  return { allowed: true, reason: null, badge: quota.label };
}

export const TONE_CLASSES: Record<EventTone, string> = {
  blue: 'bg-blue-100 text-blue-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  slate: 'bg-slate-200 text-slate-700',
  rose: 'bg-rose-100 text-rose-700',
  amber: 'bg-amber-100 text-amber-800',
};

export const TONE_BAR_CLASSES: Record<EventTone, string> = {
  blue: 'bg-blue-600',
  emerald: 'bg-emerald-500',
  slate: 'bg-slate-400',
  rose: 'bg-rose-500',
  amber: 'bg-amber-500',
};
