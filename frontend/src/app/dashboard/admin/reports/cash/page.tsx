'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  FileSpreadsheet,
  Heart,
  Info,
  RefreshCw,
  Ticket,
  Wallet,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { formatDateId, formatNumber, formatRupiah, type CashReport } from '@/lib/reports';

type Preset = 'THIS_MONTH' | 'LAST_3_MONTHS' | 'THIS_YEAR' | 'CUSTOM';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('retemali_token');
}

function toInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function resolvePreset(preset: Preset): { from: string; to: string } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (preset === 'THIS_MONTH') {
    return {
      from: toInputDate(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: toInputDate(end),
    };
  }
  if (preset === 'LAST_3_MONTHS') {
    return {
      from: toInputDate(new Date(now.getFullYear(), now.getMonth() - 2, 1)),
      to: toInputDate(end),
    };
  }
  if (preset === 'THIS_YEAR') {
    return { from: toInputDate(new Date(now.getFullYear(), 0, 1)), to: toInputDate(end) };
  }
  return { from: '', to: '' };
}

const PRESET_LABELS: Record<Preset, string> = {
  THIS_MONTH: 'Bulan ini',
  LAST_3_MONTHS: '3 bulan',
  THIS_YEAR: 'Tahun ini',
  CUSTOM: 'Kustom',
};

const CATEGORY_STYLES: Record<string, { bar: string; icon: React.ReactNode }> = {
  DONASI_FINANSIAL: {
    bar: 'bg-blue-600',
    icon: <Heart size={14} className="text-blue-600" />,
  },
  INFAQ_KEGIATAN: {
    bar: 'bg-emerald-500',
    icon: <Ticket size={14} className="text-emerald-600" />,
  },
  DENDA_SIRKULASI: {
    bar: 'bg-amber-500',
    icon: <Banknote size={14} className="text-amber-600" />,
  },
};

export default function CashReportPage() {
  const router = useRouter();

  const initial = useMemo(() => resolvePreset('THIS_MONTH'), []);
  const [preset, setPreset] = useState<Preset>('THIS_MONTH');
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [applied, setApplied] = useState(initial);

  const [report, setReport] = useState<CashReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as { role?: string };
      if (payload.role !== 'ADMIN') router.replace('/login');
    } catch {
      router.replace('/login');
    }
  }, [router]);

  const buildQuery = useCallback((filters: { from: string; to: string }) => {
    const params = new URLSearchParams();
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    return params.toString();
  }, []);

  const loadReport = useCallback(
    async (filters: { from: string; to: string }) => {
      const token = getToken();
      if (!token) return;

      setLoading(true);
      setError(null);

      try {
        const query = buildQuery(filters);
        const response = await fetch(`/api/reports/cash${query ? `?${query}` : ''}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const payload = (await response.json().catch(() => null)) as
          | { status?: string; message?: string; data?: CashReport }
          | null;

        if (!response.ok || !payload?.data) {
          throw new Error(payload?.message ?? 'Gagal memuat laporan kas.');
        }

        setReport(payload.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat laporan kas.');
        setReport(null);
      } finally {
        setLoading(false);
      }
    },
    [buildQuery]
  );

  useEffect(() => {
    loadReport(applied);
  }, [loadReport, applied]);

  const handlePreset = (next: Preset) => {
    setPreset(next);
    if (next !== 'CUSTOM') {
      const range = resolvePreset(next);
      setFrom(range.from);
      setTo(range.to);
      setApplied(range);
    }
  };

  const handleExport = async () => {
    const token = getToken();
    if (!token) return;

    setExporting(true);
    try {
      const query = buildQuery(applied);
      const response = await fetch(`/api/reports/cash/export${query ? `?${query}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? 'Gagal membuat berkas Excel.');
      }

      const blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition') ?? '';
      const match = /filename="?([^"]+)"?/.exec(disposition);
      const filename = match?.[1] ?? 'laporan-kas.xlsx';

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

  const summary = report?.summary;
  const maxCategoryAmount = Math.max(1, ...(report?.byCategory.map((row) => row.amount) ?? [1]));

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

      <Header title="Laporan Kas" subtitle="Arus kas & donasi" showBack />

      <main className="px-4 pt-4 space-y-4">
        {/* Period */}
        <section className="bg-white rounded-2xl shadow-sm border border-blue-100/70 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Wallet size={16} className="text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Periode Laporan Kas</h2>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {(Object.keys(PRESET_LABELS) as Preset[]).map((option) => (
              <button
                key={option}
                onClick={() => handlePreset(option)}
                className={`py-1.5 rounded-lg text-[10px] font-bold transition-colors ${
                  preset === option
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {PRESET_LABELS[option]}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Dari</label>
              <input
                type="date"
                value={from}
                onChange={(event) => {
                  setFrom(event.target.value);
                  setPreset('CUSTOM');
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Sampai</label>
              <input
                type="date"
                value={to}
                onChange={(event) => {
                  setTo(event.target.value);
                  setPreset('CUSTOM');
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setApplied({ from, to })}
              disabled={loading}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Menghitung...' : 'Generate Laporan'}
            </button>
            <button
              onClick={handleExport}
              disabled={exporting || loading || !report}
              className="px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              <FileSpreadsheet size={14} />
              {exporting ? '...' : '.xlsx'}
            </button>
          </div>
        </section>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-2">
            <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-rose-800">{error}</p>
              <button
                onClick={() => loadReport(applied)}
                className="mt-2 text-[11px] font-bold text-rose-700 underline"
              >
                Coba lagi
              </button>
            </div>
          </div>
        )}

        {/* Summary */}
        <section className="bg-gradient-to-br from-blue-700 via-blue-700 to-indigo-700 rounded-2xl p-4 text-white shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
            Total arus kas masuk
          </p>
          <p className="text-2xl font-extrabold mt-1">
            {loading ? '—' : formatRupiah(summary?.totalIncome ?? 0)}
          </p>
          <p className="text-[11px] text-blue-200 mt-0.5">
            {formatDateId(applied.from)} – {formatDateId(applied.to)} •{' '}
            {formatNumber(summary?.transactionCount ?? 0)} transaksi
          </p>

          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="bg-white/10 rounded-xl p-2">
              <p className="text-[9px] text-blue-200 font-semibold">Donasi</p>
              <p className="text-[11px] font-bold truncate">
                {formatRupiah(summary?.donationIncome ?? 0)}
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-2">
              <p className="text-[9px] text-blue-200 font-semibold">Infaq</p>
              <p className="text-[11px] font-bold truncate">
                {formatRupiah(summary?.eventInfaqIncome ?? 0)}
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-2">
              <p className="text-[9px] text-blue-200 font-semibold">Denda</p>
              <p className="text-[11px] font-bold truncate">
                {formatRupiah(summary?.fineIncome ?? 0)}
              </p>
            </div>
          </div>
        </section>

        {/* Expense gap notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-start gap-2">
          <Info size={15} className="text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-amber-900">Pengeluaran belum tercatat</p>
            <p className="text-[10px] text-amber-800 leading-snug">
              {report?.expenseTracking.reason ??
                'Belum ada tabel/field pengeluaran pada basis data, sehingga laporan ini hanya merekam arus kas masuk.'}
            </p>
            <p className="text-[10px] text-amber-800 leading-snug">
              Saldo bersih = arus kas masuk ({formatRupiah(summary?.netCashFlow ?? 0)}).
            </p>
          </div>
        </div>

        {/* By category */}
        <section className="bg-white rounded-2xl shadow-sm border border-blue-100/70 p-4 space-y-3">
          <h2 className="text-sm font-bold text-slate-900">Komposisi Pemasukan</h2>
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2.5">
              {(report?.byCategory ?? []).map((row) => {
                const style = CATEGORY_STYLES[row.category] ?? {
                  bar: 'bg-slate-400',
                  icon: <Wallet size={14} className="text-slate-500" />,
                };
                const width = Math.round((row.amount / maxCategoryAmount) * 100);
                return (
                  <div key={row.category} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                        {style.icon}
                        {row.label}
                        <span className="text-slate-400 font-normal">({row.count})</span>
                      </span>
                      <span className="font-bold text-slate-900">{formatRupiah(row.amount)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${style.bar}`} style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* By method + month */}
        {!loading && report && (report.byMethod.length > 0 || report.byMonth.length > 0) && (
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-white rounded-2xl shadow-sm border border-blue-100/70 p-3 space-y-1.5">
              <p className="text-[11px] font-bold text-slate-900">Per Metode</p>
              {report.byMethod.length === 0 ? (
                <p className="text-[10px] text-slate-400">Belum ada data</p>
              ) : (
                report.byMethod.slice(0, 5).map((row) => (
                  <div key={row.method} className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-600 truncate">{row.method}</span>
                    <span className="font-semibold text-slate-800">
                      {formatRupiah(row.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-blue-100/70 p-3 space-y-1.5">
              <p className="text-[11px] font-bold text-slate-900">Per Bulan</p>
              {report.byMonth.length === 0 ? (
                <p className="text-[10px] text-slate-400">Belum ada data</p>
              ) : (
                report.byMonth.slice(-5).map((row) => (
                  <div key={row.month} className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-600 truncate">{row.label}</span>
                    <span className="font-semibold text-slate-800">
                      {formatRupiah(row.income)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Ledger */}
        <section className="bg-white rounded-2xl shadow-sm border border-blue-100/70 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Rincian Transaksi</h2>
            <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              {formatNumber(report?.entries.length ?? 0)}
            </span>
          </div>

          {loading && (
            <div className="space-y-2">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          )}

          {!loading && (report?.entries.length ?? 0) === 0 && (
            <p className="text-[11px] text-slate-400 text-center py-4">
              Tidak ada transaksi pada periode ini.
            </p>
          )}

          <div className="space-y-2">
            {(report?.entries ?? []).map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100"
              >
                <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                  {CATEGORY_STYLES[entry.category]?.icon ?? (
                    <ArrowUpRight size={13} className="text-slate-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-slate-800 line-clamp-2">
                    {entry.label}
                  </p>
                  <p className="text-[9px] text-slate-500">
                    {formatDateId(entry.date)} • {entry.method} • {entry.reference}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] font-bold text-emerald-700 flex items-center gap-0.5 justify-end">
                    <ArrowDownRight size={11} />
                    {formatRupiah(entry.amount)}
                  </p>
                  <p className="text-[9px] text-slate-400">{entry.status}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {report && !report.dataSources.events && (
          <p className="text-[10px] text-amber-700 text-center">
            Data infaq kegiatan tidak dapat dimuat — laporan ditampilkan tanpa komponen tersebut.
          </p>
        )}
        {report && !report.dataSources.loans && (
          <p className="text-[10px] text-amber-700 text-center">
            Data denda sirkulasi tidak dapat dimuat — laporan ditampilkan tanpa komponen tersebut.
          </p>
        )}
      </main>
    </div>
  );
}
