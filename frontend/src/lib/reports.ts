/**
 * Report domain models + pure builders.
 *
 * Route handlers fetch raw rows from the API and pass them through these
 * builders so the on-screen report and the Excel export are always identical.
 */

import { computeEventTimeline, computeQuotaState, type EventPhase } from './events';

// ─── Shared ──────────────────────────────────────────────────────────────────

export interface ReportPeriod {
  from: string | null;
  to: string | null;
}

const MONTHS_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export function formatDateId(value: string | Date | null | undefined): string {
  if (!value) return '-';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '-';
  return `${date.getDate()} ${MONTHS_ID[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatDateTimeId(value: string | Date | null | undefined): string {
  if (!value) return '-';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '-';
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${formatDateId(date)} • ${hours}:${minutes} WIB`;
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('id-ID').format(Number.isFinite(value) ? value : 0);
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function inPeriod(value: string | Date | null | undefined, period: ReportPeriod): boolean {
  if (!value) return true;
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return true;
  if (period.from && date.getTime() < new Date(period.from).getTime()) return false;
  if (period.to) {
    const end = new Date(period.to);
    // Inclusive end-of-day when only a date (YYYY-MM-DD) is supplied.
    if (typeof period.to === 'string' && period.to.length <= 10) {
      end.setHours(23, 59, 59, 999);
    }
    if (date.getTime() > end.getTime()) return false;
  }
  return true;
}

// ─── Attendance report ───────────────────────────────────────────────────────

export type TicketState = 'REGISTERED' | 'CHECKED_IN' | 'CANCELLED';

export interface AttendanceParticipant {
  registrationId: string;
  ticketCode: string;
  memberCode: string;
  memberName: string;
  memberPhone: string | null;
  memberRtRw: string | null;
  status: TicketState;
  registeredAt: string;
  checkedInAt: string | null;
}

export interface AttendanceEventRow {
  eventId: string;
  title: string;
  category: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  location: string;
  facilitatorName: string;
  phase: EventPhase;
  phaseLabel: string;
  isAutoClosed: boolean;
  quota: number;
  registeredCount: number;
  activeRegistered: number;
  checkedInCount: number;
  cancelledCount: number;
  noShowCount: number;
  seatsLeft: number;
  isQuotaFull: boolean;
  attendanceRate: number;
  reportSummary: string | null;
  reportApproved: boolean;
  participants: AttendanceParticipant[];
}

export interface AttendanceReport {
  generatedAt: string;
  period: ReportPeriod;
  totals: {
    events: number;
    quota: number;
    registered: number;
    checkedIn: number;
    cancelled: number;
    noShow: number;
    attendanceRate: number;
    autoClosedEvents: number;
  };
  events: AttendanceEventRow[];
}

export interface UpstreamAttendanceRegistration {
  id: string;
  ticketCode: string;
  status: string;
  checkedInAt: string | null;
  registeredAt: string;
  memberCode: string;
  memberName: string;
  memberPhone?: string | null;
  memberRtRw?: string | null;
}

export interface UpstreamAttendanceEvent {
  id: string;
  title: string;
  category: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  location: string;
  facilitatorName: string;
  quota: number;
  registeredCount: number;
  status: string;
  reportSummary?: string | null;
  reportApproved?: boolean | null;
  registrations?: UpstreamAttendanceRegistration[];
}

export function buildAttendanceReport(
  events: UpstreamAttendanceEvent[],
  period: ReportPeriod,
  now: Date = new Date()
): AttendanceReport {
  const rows: AttendanceEventRow[] = events.map((event) => {
    const timeline = computeEventTimeline(event, now);
    const quota = computeQuotaState(event.quota, event.registeredCount);
    const registrations = event.registrations ?? [];

    const checkedInCount = registrations.filter((r) => r.status === 'CHECKED_IN').length;
    const cancelledCount = registrations.filter((r) => r.status === 'CANCELLED').length;
    const activeRegistered = registrations.filter((r) => r.status !== 'CANCELLED').length;
    const sessionFinished = timeline.phase === 'ENDED' || timeline.phase === 'COMPLETED';
    const noShowCount = sessionFinished ? Math.max(0, activeRegistered - checkedInCount) : 0;
    const attendanceRate =
      activeRegistered > 0 ? Math.round((checkedInCount / activeRegistered) * 100) : 0;

    return {
      eventId: event.id,
      title: event.title,
      category: event.category,
      eventDate: event.eventDate,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      facilitatorName: event.facilitatorName,
      phase: timeline.phase,
      phaseLabel: timeline.label,
      isAutoClosed: timeline.isAutoClosed,
      quota: quota.quota,
      registeredCount: quota.registered,
      activeRegistered,
      checkedInCount,
      cancelledCount,
      noShowCount,
      seatsLeft: quota.seatsLeft,
      isQuotaFull: quota.isFull,
      attendanceRate,
      reportSummary: event.reportSummary ?? null,
      reportApproved: Boolean(event.reportApproved),
      participants: registrations.map((registration) => ({
        registrationId: registration.id,
        ticketCode: registration.ticketCode,
        memberCode: registration.memberCode,
        memberName: registration.memberName,
        memberPhone: registration.memberPhone ?? null,
        memberRtRw: registration.memberRtRw ?? null,
        status: (registration.status as TicketState) ?? 'REGISTERED',
        registeredAt: registration.registeredAt,
        checkedInAt: registration.checkedInAt ?? null,
      })),
    };
  });

  const totals = rows.reduce(
    (acc, row) => {
      acc.quota += row.quota;
      acc.registered += row.activeRegistered;
      acc.checkedIn += row.checkedInCount;
      acc.cancelled += row.cancelledCount;
      acc.noShow += row.noShowCount;
      if (row.isAutoClosed) acc.autoClosedEvents += 1;
      return acc;
    },
    {
      events: rows.length,
      quota: 0,
      registered: 0,
      checkedIn: 0,
      cancelled: 0,
      noShow: 0,
      attendanceRate: 0,
      autoClosedEvents: 0,
    }
  );

  totals.attendanceRate =
    totals.registered > 0 ? Math.round((totals.checkedIn / totals.registered) * 100) : 0;

  return {
    generatedAt: now.toISOString(),
    period,
    totals,
    events: rows,
  };
}

// ─── Cash report ─────────────────────────────────────────────────────────────

export type CashCategory = 'DONASI_FINANSIAL' | 'INFAQ_KEGIATAN' | 'DENDA_SIRKULASI';

export interface CashEntry {
  id: string;
  date: string;
  category: CashCategory;
  categoryLabel: string;
  label: string;
  method: string;
  reference: string;
  amount: number;
  status: string;
}

export interface CashReport {
  generatedAt: string;
  period: ReportPeriod;
  summary: {
    totalIncome: number;
    totalExpense: number;
    netCashFlow: number;
    donationIncome: number;
    eventInfaqIncome: number;
    fineIncome: number;
    transactionCount: number;
  };
  byCategory: Array<{ category: CashCategory; label: string; amount: number; count: number }>;
  byMethod: Array<{ method: string; amount: number; count: number }>;
  byMonth: Array<{ month: string; label: string; income: number }>;
  entries: CashEntry[];
  dataSources: { donations: boolean; events: boolean; loans: boolean };
  expenseTracking: { available: boolean; reason: string };
}

export interface UpstreamFinancialDonation {
  id: string;
  receiptCode: string;
  donorName: string;
  isAnonymous?: boolean;
  amount: string | number;
  purposeLabel?: string | null;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
}

export interface UpstreamCashEvent {
  id: string;
  title: string;
  eventDate: string;
  feeType: string;
  infaqAmount?: string | number | null;
  registeredCount: number;
  status: string;
}

export interface UpstreamLoanFine {
  id: string;
  loanCode: string;
  fineAmount?: string | number | null;
  borrowedAt: string;
  returnedAt?: string | null;
  status: string;
  user?: { name?: string | null } | null;
  book?: { title?: string | null } | null;
}

const CATEGORY_LABELS: Record<CashCategory, string> = {
  DONASI_FINANSIAL: 'Donasi Finansial',
  INFAQ_KEGIATAN: 'Infaq Kegiatan',
  DENDA_SIRKULASI: 'Denda Sirkulasi',
};

const METHOD_LABELS: Record<string, string> = {
  QRIS: 'QRIS',
  BANK_MANDIRI: 'Bank Mandiri',
  BANK_BCA: 'Bank BCA',
  GOPAY: 'GoPay',
  OVO: 'OVO',
  DANA: 'DANA',
  SHOPEEPAY: 'ShopeePay',
  TUNAI: 'Tunai / Loket',
  SISTEM: 'Sistem',
};

export function labelPaymentMethod(method: string): string {
  return METHOD_LABELS[method] ?? method;
}

export function buildCashReport(params: {
  donations: UpstreamFinancialDonation[];
  events: UpstreamCashEvent[];
  loans: UpstreamLoanFine[];
  period: ReportPeriod;
  sources?: { donations: boolean; events: boolean; loans: boolean };
  now?: Date;
}): CashReport {
  const now = params.now ?? new Date();
  const entries: CashEntry[] = [];

  for (const donation of params.donations) {
    if (!inPeriod(donation.createdAt, params.period)) continue;
    if ((donation.paymentStatus ?? '').toUpperCase() !== 'VERIFIED') continue;

    const donor = donation.isAnonymous ? 'Donatur Anonim' : donation.donorName;
    entries.push({
      id: `donation-${donation.id}`,
      date: donation.createdAt,
      category: 'DONASI_FINANSIAL',
      categoryLabel: CATEGORY_LABELS.DONASI_FINANSIAL,
      label: `${donor}${donation.purposeLabel ? ` • ${donation.purposeLabel}` : ''}`,
      method: labelPaymentMethod(donation.paymentMethod),
      reference: donation.receiptCode,
      amount: toNumber(donation.amount),
      status: donation.paymentStatus,
    });
  }

  for (const event of params.events) {
    if ((event.feeType ?? '').toUpperCase() !== 'INFAQ') continue;
    if (!inPeriod(event.eventDate, params.period)) continue;

    const perParticipant = toNumber(event.infaqAmount);
    if (perParticipant <= 0) continue;

    const total = perParticipant * Math.max(0, event.registeredCount ?? 0);
    if (total <= 0) continue;

    entries.push({
      id: `event-${event.id}`,
      date: event.eventDate,
      category: 'INFAQ_KEGIATAN',
      categoryLabel: CATEGORY_LABELS.INFAQ_KEGIATAN,
      label: `${event.title} • ${event.registeredCount} peserta × ${formatRupiah(perParticipant)}`,
      method: 'TUNAI',
      reference: event.id.slice(0, 12).toUpperCase(),
      amount: total,
      status: 'ESTIMASI',
    });
  }

  for (const loan of params.loans) {
    const amount = toNumber(loan.fineAmount);
    if (amount <= 0) continue;
    const date = loan.returnedAt ?? loan.borrowedAt;
    if (!inPeriod(date, params.period)) continue;

    entries.push({
      id: `loan-${loan.id}`,
      date,
      category: 'DENDA_SIRKULASI',
      categoryLabel: CATEGORY_LABELS.DENDA_SIRKULASI,
      label: `${loan.user?.name ?? 'Anggota'} • ${loan.book?.title ?? 'Buku'}`,
      method: 'TUNAI',
      reference: loan.loanCode,
      amount,
      status: loan.status,
    });
  }

  entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const donationIncome = entries
    .filter((entry) => entry.category === 'DONASI_FINANSIAL')
    .reduce((sum, entry) => sum + entry.amount, 0);
  const eventInfaqIncome = entries
    .filter((entry) => entry.category === 'INFAQ_KEGIATAN')
    .reduce((sum, entry) => sum + entry.amount, 0);
  const fineIncome = entries
    .filter((entry) => entry.category === 'DENDA_SIRKULASI')
    .reduce((sum, entry) => sum + entry.amount, 0);
  const totalIncome = donationIncome + eventInfaqIncome + fineIncome;

  const byCategory = (Object.keys(CATEGORY_LABELS) as CashCategory[]).map((category) => {
    const subset = entries.filter((entry) => entry.category === category);
    return {
      category,
      label: CATEGORY_LABELS[category],
      amount: subset.reduce((sum, entry) => sum + entry.amount, 0),
      count: subset.length,
    };
  });

  const methodMap = new Map<string, { amount: number; count: number }>();
  for (const entry of entries) {
    const current = methodMap.get(entry.method) ?? { amount: 0, count: 0 };
    methodMap.set(entry.method, {
      amount: current.amount + entry.amount,
      count: current.count + 1,
    });
  }
  const byMethod = Array.from(methodMap.entries())
    .map(([method, value]) => ({ method, ...value }))
    .sort((a, b) => b.amount - a.amount);

  const monthMap = new Map<string, number>();
  for (const entry of entries) {
    const date = new Date(entry.date);
    if (Number.isNaN(date.getTime())) continue;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthMap.set(key, (monthMap.get(key) ?? 0) + entry.amount);
  }
  const byMonth = Array.from(monthMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, income]) => {
      const [year, monthNumber] = month.split('-');
      return {
        month,
        label: `${MONTHS_ID[Number(monthNumber) - 1]} ${year}`,
        income,
      };
    });

  return {
    generatedAt: now.toISOString(),
    period: params.period,
    summary: {
      totalIncome,
      totalExpense: 0,
      netCashFlow: totalIncome,
      donationIncome,
      eventInfaqIncome,
      fineIncome,
      transactionCount: entries.length,
    },
    byCategory,
    byMethod,
    byMonth,
    entries,
    dataSources: params.sources ?? { donations: true, events: true, loans: true },
    expenseTracking: {
      available: false,
      reason:
        'Pencatatan pengeluaran belum tersedia: belum ada tabel/field pengeluaran pada basis data, sehingga laporan ini hanya merekam arus kas masuk.',
    },
  };
}
