'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock,
  RefreshCw,
  Search,
  Undo2,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { formatDateId, formatNumber, formatRupiah } from '@/lib/reports';

interface BorrowingRow {
  id: string;
  loanCode: string;
  status: string;
  borrowedAt: string;
  dueDate: string;
  returnedAt: string | null;
  extendedCount: number;
  fineAmount: number;
  overdueDays: number;
  daysUntilDue: number;
  isOverdue: boolean;
  member: {
    memberCode: string;
    name: string;
    phone: string | null;
    rtRw: string | null;
  };
  book: {
    bookCode: string;
    title: string;
    author: string | null;
  };
}

interface BorrowingMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface BorrowingResponse {
  rows: BorrowingRow[];
  meta: BorrowingMeta;
  pageSummary: { total: number; active: number; overdue: number; returned: number; fines: number };
  fetchedAt: string;
}

const STATUS_TABS = [
  { id: 'ALL', label: 'Semua' },
  { id: 'BORROWED', label: 'Dipinjam' },
  { id: 'OVERDUE', label: 'Terlambat' },
  { id: 'RETURNED', label: 'Kembali' },
  { id: 'LOST', label: 'Hilang' },
];

const STATUS_CLASSES: Record<string, string> = {
  BORROWED: 'bg-blue-100 text-blue-700',
  RETURNED: 'bg-emerald-100 text-emerald-700',
  OVERDUE: 'bg-rose-100 text-rose-700',
  LOST: 'bg-slate-800 text-white',
};

const STATUS_LABELS: Record<string, string> = {
  BORROWED: 'Dipinjam',
  RETURNED: 'Dikembalikan',
  OVERDUE: 'Terlambat',
  LOST: 'Hilang',
};

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('retemali_token');
}

export default function BorrowingLogsPage() {
  const router = useRouter();

  const [data, setData] = useState<BorrowingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as { role?: string };
      if (payload.role !== 'ADMIN' && payload.role !== 'VOLUNTEER') router.replace('/login');
    } catch {
      router.replace('/login');
    }
  }, [router]);

  // Debounce the search box so typing does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadLogs = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ page: String(page), limit: '20', status });
      if (search) params.set('search', search);

      const response = await fetch(`/api/borrowings?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const payload = (await response.json().catch(() => null)) as
        | { status?: string; message?: string; data?: BorrowingResponse }
        | null;

      if (!response.ok || !payload?.data) {
        throw new Error(payload?.message ?? 'Gagal memuat log peminjaman.');
      }

      setData(payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat log peminjaman.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, status, search]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const rows = data?.rows ?? [];
  const meta = data?.meta;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-blue-50/60 pb-16 text-slate-800">
      <Header title="Log Peminjaman" subtitle="Arsip sirkulasi buku" showBack />

      <main className="px-4 pt-4 space-y-4">
        {/* Summary */}
        <section className="bg-gradient-to-br from-slate-900 to-slate-700 rounded-2xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                Total transaksi tercatat
              </p>
              <p className="text-2xl font-extrabold mt-0.5">
                {loading && !data ? '—' : formatNumber(meta?.total ?? 0)}
              </p>
            </div>
            <button
              onClick={loadLogs}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20"
              aria-label="Muat ulang log"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5 mt-3">
            <div className="bg-white/10 rounded-lg p-1.5 text-center">
              <p className="text-xs font-bold">{data?.pageSummary.active ?? 0}</p>
              <p className="text-[8px] text-slate-300">Aktif</p>
            </div>
            <div className="bg-white/10 rounded-lg p-1.5 text-center">
              <p className="text-xs font-bold text-rose-200">{data?.pageSummary.overdue ?? 0}</p>
              <p className="text-[8px] text-slate-300">Terlambat</p>
            </div>
            <div className="bg-white/10 rounded-lg p-1.5 text-center">
              <p className="text-xs font-bold text-emerald-200">
                {data?.pageSummary.returned ?? 0}
              </p>
              <p className="text-[8px] text-slate-300">Kembali</p>
            </div>
            <div className="bg-white/10 rounded-lg p-1.5 text-center">
              <p className="text-xs font-bold text-amber-200">
                {formatRupiah(data?.pageSummary.fines ?? 0).replace('Rp', '')}
              </p>
              <p className="text-[8px] text-slate-300">Denda</p>
            </div>
          </div>
          <p className="text-[9px] text-slate-400 mt-2">
            Ringkasan mengacu pada halaman yang sedang ditampilkan.
          </p>
        </section>

        {/* Filters */}
        <section className="bg-white rounded-2xl shadow-sm border border-blue-100/70 p-3 space-y-2.5">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Cari nama anggota, kode buku, atau no. pinjam..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setStatus(tab.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors ${
                  status === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-2">
            <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-rose-800">{error}</p>
              <button onClick={loadLogs} className="mt-2 text-[11px] font-bold text-rose-700 underline">
                Coba lagi
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <section className="bg-white rounded-2xl shadow-sm border border-blue-100/70 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
            <h2 className="text-xs font-bold text-slate-900">Riwayat Peminjaman</h2>
            <span className="text-[10px] text-slate-500">
              Hal. {meta?.page ?? 1} / {Math.max(1, meta?.totalPages ?? 1)}
            </span>
          </div>

          {loading && rows.length === 0 && (
            <div className="p-3 space-y-2">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="h-14 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          )}

          {!loading && rows.length === 0 && !error && (
            <div className="py-10 text-center space-y-1">
              <BookOpen size={26} className="text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-600">Tidak ada data peminjaman</p>
              <p className="text-[10px] text-slate-400">
                Coba ubah filter status atau kata kunci pencarian.
              </p>
            </div>
          )}

          {rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[10px]">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-3 py-2 font-bold">Anggota</th>
                    <th className="px-2 py-2 font-bold">Buku</th>
                    <th className="px-2 py-2 font-bold">Pinjam</th>
                    <th className="px-2 py-2 font-bold">Jatuh Tempo</th>
                    <th className="px-2 py-2 font-bold">Status</th>
                    <th className="px-3 py-2 font-bold text-right">Kode Pinjam</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100 align-top">
                      <td className="px-3 py-2.5">
                        <p className="font-bold text-slate-800">{row.member.name}</p>
                        <p className="text-slate-500 font-mono">{row.member.memberCode}</p>
                        {row.member.rtRw && (
                          <p className="text-slate-400">{row.member.rtRw}</p>
                        )}
                      </td>
                      <td className="px-2 py-2.5 max-w-[120px]">
                        <p className="font-semibold text-slate-800 line-clamp-2">
                          {row.book.title}
                        </p>
                        <p className="text-slate-500 font-mono">{row.book.bookCode}</p>
                      </td>
                      <td className="px-2 py-2.5 text-slate-600 whitespace-nowrap">
                        {formatDateId(row.borrowedAt)}
                        {row.extendedCount > 0 && (
                          <span className="block text-[9px] text-blue-600 font-semibold">
                            +{row.extendedCount}x perpanjang
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2.5 whitespace-nowrap">
                        <p className="text-slate-600">{formatDateId(row.dueDate)}</p>
                        {row.isOverdue ? (
                          <span className="inline-flex items-center gap-0.5 text-rose-600 font-bold">
                            <Clock size={9} /> +{row.overdueDays} hari
                          </span>
                        ) : row.status === 'RETURNED' && row.returnedAt ? (
                          <span className="inline-flex items-center gap-0.5 text-emerald-600 font-semibold">
                            <Undo2 size={9} /> {formatDateId(row.returnedAt)}
                          </span>
                        ) : (
                          <span className="text-slate-400">{row.daysUntilDue} hari lagi</span>
                        )}
                      </td>
                      <td className="px-2 py-2.5">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap ${
                            STATUS_CLASSES[row.status] ?? 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {STATUS_LABELS[row.status] ?? row.status}
                        </span>
                        {row.fineAmount > 0 && (
                          <p className="text-[9px] text-amber-700 font-semibold mt-1">
                            Denda {formatRupiah(row.fineAmount)}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <p className="text-[8px] text-slate-400 mt-1 font-mono">{row.loanCode}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-3 py-2.5 border-t border-slate-100">
              <button
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={!meta.hasPrevPage || loading}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-600 disabled:opacity-40"
              >
                <ChevronLeft size={12} /> Sebelumnya
              </button>
              <span className="text-[10px] text-slate-500">
                {formatNumber(meta.total)} data
              </span>
              <button
                onClick={() => setPage((current) => current + 1)}
                disabled={!meta.hasNextPage || loading}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-600 disabled:opacity-40"
              >
                Berikutnya <ChevronRight size={12} />
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
