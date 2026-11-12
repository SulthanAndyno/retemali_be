'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Ticket,
  UserX,
  Users,
  XCircle,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import {
  formatDateId,
  formatDateTimeId,
  formatNumber,
  type AttendanceReport,
  type AttendanceEventRow,
} from '@/lib/reports';

const PHASE_CLASSES: Record<string, string> = {
  UPCOMING: 'bg-blue-100 text-blue-700',
  ONGOING: 'bg-emerald-100 text-emerald-700',
  ENDED: 'bg-slate-200 text-slate-700',
  COMPLETED: 'bg-slate-200 text-slate-700',
  CANCELLED: 'bg-rose-100 text-rose-700',
  DRAFT: 'bg-amber-100 text-amber-800',
};

const TICKET_CLASSES: Record<string, string> = {
  CHECKED_IN: 'bg-emerald-100 text-emerald-700',
  REGISTERED: 'bg-blue-100 text-blue-700',
  CANCELLED: 'bg-rose-100 text-rose-700',
};

const TICKET_LABEL: Record<string, string> = {
  CHECKED_IN: 'Hadir',
  REGISTERED: 'Terdaftar',
  CANCELLED: 'Dibatalkan',
};

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('retemali_token');
}

export default function AttendanceReportPage() {
  const router = useRouter();

  const [report, setReport] = useState<AttendanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [eventId, setEventId] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({ from: '', to: '', eventId: '' });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Auth guard — same pattern as the admin console.
  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as { role?: string };
      if (payload.role !== 'ADMIN' && payload.role !== 'VOLUNTEER') {
        router.replace('/login');
      }
    } catch {
      router.replace('/login');
    }
  }, [router]);

  const buildQuery = useCallback(
    (filters: { from: string; to: string; eventId: string }) => {
      const params = new URLSearchParams();
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      if (filters.eventId) params.set('eventId', filters.eventId);
      return params.toString();
    },
    []
  );

  const loadReport = useCallback(
    async (filters: { from: string; to: string; eventId: string }) => {
      const token = getToken();
      if (!token) return;

      setLoading(true);
      setError(null);

      try {
        const query = buildQuery(filters);
        const response = await fetch(`/api/reports/attendance${query ? `?${query}` : ''}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const payload = (await response.json().catch(() => null)) as
          | { status?: string; message?: string; data?: AttendanceReport }
          | null;

        if (!response.ok || !payload?.data) {
          throw new Error(payload?.message ?? 'Gagal memuat laporan presensi.');
        }

        setReport(payload.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat laporan presensi.');
        setReport(null);
      } finally {
        setLoading(false);
      }
    },
    [buildQuery]
  );

  useEffect(() => {
    loadReport(appliedFilters);
  }, [loadReport, appliedFilters]);

  const handleApplyFilters = () => {
    setAppliedFilters({ from, to, eventId });
  };

  const handleResetFilters = () => {
    setFrom('');
    setTo('');
    setEventId('');
    setAppliedFilters({ from: '', to: '', eventId: '' });
  };

  const handleExport = async () => {
    const token = getToken();
    if (!token) return;

    setExporting(true);
    try {
      const query = buildQuery(appliedFilters);
      const response = await fetch(
        `/api/reports/attendance/export${query ? `?${query}` : ''}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? 'Gagal membuat berkas Excel.');
      }

      const blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition') ?? '';
      const match = /filename="?([^"]+)"?/.exec(disposition);
      const filename = match?.[1] ?? 'laporan-presensi.xlsx';

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      showToast(`Berkas ${filename} berhasil diunduh.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal membuat berkas Excel.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const totals = report?.totals;
  const eventOptions = useMemo(() => report?.events ?? [], [report]);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-blue-50/60 pb-16 text-slate-800">
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold max-w-[90%] ${
            toast.type === 'success' ? 'bg-blue-600 text-white' : 'bg-rose-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      <Header title="Laporan Presensi" subtitle="Rekap kehadiran kegiatan" showBack />

      <main className="px-4 pt-4 space-y-4">
        {/* Filters */}
        <section className="bg-white rounded-2xl shadow-sm border border-blue-100/70 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className="text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Periode Laporan</h2>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Dari tanggal</label>
              <input
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Sampai tanggal</label>
              <input
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
              Kegiatan tertentu (opsional)
            </label>
            <select
              value={eventId}
              onChange={(event) => setEventId(event.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua kegiatan</option>
              {eventOptions.map((event) => (
                <option key={event.eventId} value={event.eventId}>
                  {event.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleApplyFilters}
              disabled={loading}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Memuat...' : 'Tampilkan'}
            </button>
            <button
              onClick={handleResetFilters}
              className="px-3 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
            >
              Reset
            </button>
          </div>

          <button
            onClick={handleExport}
            disabled={exporting || loading || !report}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            <FileSpreadsheet size={14} />
            {exporting ? 'Menyiapkan berkas...' : 'Export Excel (.xlsx)'}
          </button>
          <p className="text-[10px] text-slate-500 text-center leading-snug">
            Berkas .xlsx berisi 3 sheet: Info Laporan, Ringkasan Event, dan Presensi Peserta.
          </p>
        </section>

        {/* Error */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-2">
            <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-rose-800">{error}</p>
              <button
                onClick={() => loadReport(appliedFilters)}
                className="mt-2 text-[11px] font-bold text-rose-700 underline"
              >
                Coba lagi
              </button>
            </div>
          </div>
        )}

        {/* KPI */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-white rounded-2xl p-3 border border-blue-50 shadow-xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <CalendarDays size={18} />
            </div>
            <div>
              <p className="text-base font-extrabold text-slate-900 leading-tight">
                {loading ? '—' : formatNumber(totals?.events ?? 0)}
              </p>
              <p className="text-[11px] text-slate-500 leading-tight">Kegiatan</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-3 border border-blue-50 shadow-xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <Users size={18} />
            </div>
            <div>
              <p className="text-base font-extrabold text-slate-900 leading-tight">
                {loading ? '—' : formatNumber(totals?.registered ?? 0)}
              </p>
              <p className="text-[11px] text-slate-500 leading-tight">Pendaftar</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-3 border border-blue-50 shadow-xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <p className="text-base font-extrabold text-slate-900 leading-tight">
                {loading ? '—' : formatNumber(totals?.checkedIn ?? 0)}
              </p>
              <p className="text-[11px] text-slate-500 leading-tight">Hadir</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-3 border border-blue-50 shadow-xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <UserX size={18} />
            </div>
            <div>
              <p className="text-base font-extrabold text-slate-900 leading-tight">
                {loading ? '—' : `${totals?.attendanceRate ?? 0}%`}
              </p>
              <p className="text-[11px] text-slate-500 leading-tight">Tingkat kehadiran</p>
            </div>
          </div>
        </div>

        {/* Auto-close notice */}
        {!loading && (totals?.autoClosedEvents ?? 0) > 0 && (
          <div className="bg-slate-100 border border-slate-200 rounded-2xl p-3 flex items-start gap-2">
            <AlertTriangle size={15} className="text-slate-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-700 leading-snug">
              <span className="font-bold">{totals?.autoClosedEvents} kegiatan</span> sudah melewati
              jadwal selesai dan ditutup otomatis oleh sistem. Pendaftaran pada kegiatan tersebut
              tidak lagi tersedia.
            </p>
          </div>
        )}

        {/* Event rows */}
        <section className="space-y-3">
          {loading && (
            <div className="space-y-3">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="bg-white rounded-2xl h-28 animate-pulse" />
              ))}
            </div>
          )}

          {!loading && report && report.events.length === 0 && (
            <div className="bg-white rounded-2xl p-6 text-center space-y-1">
              <p className="text-sm font-semibold text-slate-700">Belum ada kegiatan</p>
              <p className="text-[11px] text-slate-500">
                Tidak ada kegiatan pada periode yang dipilih. Coba ubah rentang tanggal.
              </p>
            </div>
          )}

          {!loading &&
            report?.events.map((event) => (
              <EventAttendanceCard
                key={event.eventId}
                event={event}
                expanded={expandedEventId === event.eventId}
                onToggle={() =>
                  setExpandedEventId(expandedEventId === event.eventId ? null : event.eventId)
                }
              />
            ))}
        </section>

        {report && (
          <p className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1">
            <Download size={11} />
            Dibuat {formatDateTimeId(report.generatedAt)}
          </p>
        )}
      </main>
    </div>
  );
}

function EventAttendanceCard({
  event,
  expanded,
  onToggle,
}: {
  event: AttendanceEventRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const progress = event.activeRegistered > 0
    ? Math.min(100, Math.round((event.checkedInCount / event.activeRegistered) * 100))
    : 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-blue-100/70 overflow-hidden">
      <div className="p-4 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
              {event.title}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {formatDateId(event.eventDate)} • {event.startTime}-{event.endTime} WIB
            </p>
          </div>
          <span
            className={`text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
              PHASE_CLASSES[event.phase] ?? 'bg-slate-100 text-slate-600'
            }`}
          >
            {event.phaseLabel}
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-semibold">
            <span className="text-slate-600">
              Hadir {event.checkedInCount} dari {event.activeRegistered} pendaftar
            </span>
            <span className="text-blue-700">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 text-center">
          <div className="bg-emerald-50 rounded-lg py-1.5">
            <p className="text-xs font-bold text-emerald-700">{event.checkedInCount}</p>
            <p className="text-[9px] text-emerald-700/80 font-medium">Hadir</p>
          </div>
          <div className="bg-amber-50 rounded-lg py-1.5">
            <p className="text-xs font-bold text-amber-700">{event.noShowCount}</p>
            <p className="text-[9px] text-amber-700/80 font-medium">Tidak hadir</p>
          </div>
          <div className="bg-slate-100 rounded-lg py-1.5">
            <p className="text-xs font-bold text-slate-700">
              {event.activeRegistered}/{event.quota}
            </p>
            <p className="text-[9px] text-slate-500 font-medium">Kuota</p>
          </div>
        </div>

        <button
          onClick={onToggle}
          className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 flex items-center justify-center gap-1"
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? 'Sembunyikan peserta' : `Lihat ${event.participants.length} peserta`}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-3 py-3">
          {event.participants.length === 0 ? (
            <p className="text-[11px] text-slate-500 text-center py-3">
              Belum ada peserta terdaftar pada kegiatan ini.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[10px]">
                <thead>
                  <tr className="text-slate-500 uppercase tracking-wide">
                    <th className="py-1.5 pr-2 font-bold">Peserta</th>
                    <th className="py-1.5 px-2 font-bold">Tiket</th>
                    <th className="py-1.5 px-2 font-bold">Status</th>
                    <th className="py-1.5 pl-2 font-bold">Check-in</th>
                  </tr>
                </thead>
                <tbody>
                  {event.participants.map((participant) => (
                    <tr key={participant.registrationId} className="border-t border-slate-200/70">
                      <td className="py-1.5 pr-2">
                        <p className="font-semibold text-slate-800">{participant.memberName}</p>
                        <p className="text-slate-500 font-mono">{participant.memberCode}</p>
                      </td>
                      <td className="py-1.5 px-2 font-mono text-slate-600">
                        {participant.ticketCode}
                      </td>
                      <td className="py-1.5 px-2">
                        <span
                          className={`px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap ${
                            TICKET_CLASSES[participant.status] ?? 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {TICKET_LABEL[participant.status] ?? participant.status}
                        </span>
                      </td>
                      <td className="py-1.5 pl-2 text-slate-600 whitespace-nowrap">
                        {participant.checkedInAt
                          ? formatDateTimeId(participant.checkedInAt).split('•')[1]?.trim()
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-200/70 text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <Ticket size={11} /> {event.participants.length} tiket
            </span>
            <span className="flex items-center gap-1">
              <XCircle size={11} /> {event.cancelledCount} batal
            </span>
            <span className="flex items-center gap-1">
              <Users size={11} /> kuota {event.quota}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
