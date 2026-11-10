'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  HelpCircle,
  BookOpen,
  Users,
  ArrowLeftRight,
  Heart,
  ChevronDown,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  MessageCircle,
  FileText,
  UserCheck,
  CheckSquare,
  Square,
  Activity,
  RefreshCw,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AdminStats {
  totalBooks: number;
  newBooks: number;
  activeMembers: number;
  newMembers: number;
  circulationCount: number;
  onTimePercent: number;
  totalDonation: string;
  donationTargetPercent: number;
}

interface OverdueLoan {
  id: string;
  bookTitle: string;
  bookCover?: string;
  borrowerName: string;
  overdueDays: number;
  dueDate: string;
}

interface VolunteerApplication {
  id: string;
  name: string;
  avatarInitials: string;
  education: string;
  institution: string;
  division: string;
}

interface PendingShift {
  id: string;
  volunteerName: string;
  role: string;
  startTime: string;
  endTime: string;
  duration: string;
  approved: boolean;
}

interface AuditLog {
  id: string;
  color: string;
  title: string;
  timeAgo: string;
  description: string;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

// ─── Helper ───────────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('retemali_token');
}

async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.data as T;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const router = useRouter();

  // Auth guard
  useEffect(() => {
    const token = getToken();
    if (!token) { router.replace('/login'); return; }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role !== 'ADMIN') router.replace('/login');
    } catch {
      router.replace('/login');
    }
  }, [router]);

  // State
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [overdueLoans, setOverdueLoans] = useState<OverdueLoan[]>([]);
  const [applications, setApplications] = useState<VolunteerApplication[]>([]);
  const [shifts, setShifts] = useState<PendingShift[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approveAllLoading, setApproveAllLoading] = useState(false);

  const addToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [dashData, appsData, shiftsData, logsData] = await Promise.allSettled([
        apiFetch<AdminStats>('/dashboard/admin'),
        apiFetch<VolunteerApplication[]>('/volunteers/applications'),
        apiFetch<PendingShift[]>('/volunteers/shifts?status=PENDING_APPROVAL'),
        apiFetch<AuditLog[]>('/audit-logs?limit=5'),
      ]);

      if (dashData.status === 'fulfilled') setStats(dashData.value);
      if (appsData.status === 'fulfilled') setApplications(appsData.value);
      if (shiftsData.status === 'fulfilled') setShifts(shiftsData.value);
      if (logsData.status === 'fulfilled') setAuditLogs(logsData.value);

      // Mock overdue loans from dashboard data (or use separate endpoint)
      setOverdueLoans([
        {
          id: '1',
          bookTitle: 'Laskar Pelangi',
          borrowerName: 'Budi Santoso',
          overdueDays: 4,
          dueDate: '5 Mei 2025',
        },
      ]);
    } catch {
      addToast('Gagal memuat data dashboard', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleApproveApplication = async (id: string) => {
    setApprovingId(id);
    try {
      await apiFetch(`/volunteers/applications/${id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'APPROVED' }),
      });
      setApplications((prev) => prev.filter((a) => a.id !== id));
      addToast('Relawan berhasil disetujui', 'success');
    } catch {
      addToast('Gagal menyetujui relawan', 'error');
    } finally {
      setApprovingId(null);
    }
  };

  const handleApproveShift = async (id: string) => {
    try {
      await apiFetch(`/volunteers/shifts/${id}/approve`, { method: 'PATCH' });
      setShifts((prev) =>
        prev.map((s) => (s.id === id ? { ...s, approved: true } : s))
      );
      addToast('Shift disetujui', 'success');
    } catch {
      addToast('Gagal menyetujui shift', 'error');
    }
  };

  const handleApproveAll = async () => {
    setApproveAllLoading(true);
    try {
      await apiFetch('/volunteers/shifts/approve-all', { method: 'PATCH' });
      setShifts((prev) => prev.map((s) => ({ ...s, approved: true })));
      addToast('Semua shift disetujui', 'success');
    } catch {
      addToast('Gagal menyetujui semua shift', 'error');
    } finally {
      setApproveAllLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-blue-50">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all ${
              t.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          >
            {t.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
            {t.message}
          </div>
        ))}
      </div>

      <div className="max-w-md mx-auto pb-10">
        {/* Header */}
        <div className="bg-white shadow-sm px-4 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-full transition"
            >
              <ArrowLeft size={20} className="text-gray-700" />
            </button>
            <div>
              <p className="font-semibold text-gray-900 text-sm leading-tight">Dashboard Admin</p>
              <p className="text-xs text-gray-500">Rete Mali Community</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <HelpCircle size={20} className="text-gray-500" />
            </button>
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
              AD
            </div>
          </div>
        </div>

        <div className="px-4 pt-5 space-y-5">
          {/* Admin Console Header */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-xs font-semibold text-blue-600 tracking-widest uppercase mb-1">
              Konsol Administrator
            </p>
            <h1 className="text-lg font-bold text-gray-900 leading-snug">
              Pusat Manajemen & Operasional
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Pantau sirkulasi, relawan, donasi, dan aktivitas harian Rete Mali RTO5 RW14.
            </p>
            <div className="flex items-center justify-between mt-3">
              <button className="flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-full border border-blue-200">
                Bulan Ini (Mei 2025)
                <ChevronDown size={14} />
              </button>
              <button className="flex items-center gap-1 text-xs text-blue-600 font-medium hover:underline">
                <Download size={14} />
                Unduh Laporan
              </button>
            </div>
          </div>

          {/* KPI Grid */}
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-sm p-4 animate-pulse h-24" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <KpiCard
                icon={<BookOpen size={20} className="text-blue-600" />}
                label="Koleksi Buku"
                value={stats?.totalBooks?.toLocaleString('id-ID') ?? '—'}
                sub={`+${stats?.newBooks ?? 0} buku baru`}
                subColor="text-emerald-600"
                bg="bg-blue-50"
              />
              <KpiCard
                icon={<Users size={20} className="text-blue-600" />}
                label="Anggota Aktif"
                value={stats?.activeMembers?.toLocaleString('id-ID') ?? '—'}
                sub={`+${stats?.newMembers ?? 0} warga baru`}
                subColor="text-emerald-600"
                bg="bg-blue-50"
              />
              <KpiCard
                icon={<ArrowLeftRight size={20} className="text-blue-600" />}
                label="Sirkulasi Pinjam"
                value={stats?.circulationCount?.toLocaleString('id-ID') ?? '—'}
                sub={`${stats?.onTimePercent ?? 0}% tepat waktu`}
                subColor="text-emerald-600"
                bg="bg-blue-50"
              />
              <KpiCard
                icon={<Heart size={20} className="text-yellow-500" />}
                label="Donasi Operasional"
                value={stats?.totalDonation ?? 'Rp0'}
                sub={`${stats?.donationTargetPercent ?? 0}% target rak`}
                subColor="text-yellow-600"
                bg="bg-yellow-50"
              />
            </div>
          )}

          {/* Overdue Loans */}
          <Section
            title="Peringatan Sirkulasi"
            count={overdueLoans.length}
            countColor="bg-red-100 text-red-700"
          >
            {overdueLoans.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Tidak ada keterlambatan</p>
            ) : (
              overdueLoans.map((loan) => (
                <div key={loan.id} className="flex gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                  <div className="w-12 h-16 bg-gray-200 rounded-lg flex-shrink-0 flex items-center justify-center">
                    {loan.bookCover ? (
                      <img src={loan.bookCover} alt={loan.bookTitle} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <BookOpen size={20} className="text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{loan.bookTitle}</p>
                    <p className="text-xs text-gray-500">{loan.borrowerName}</p>
                    <span className="inline-block mt-1 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      Lewat {loan.overdueDays} Hari
                    </span>
                    <p className="text-xs text-gray-400 mt-1">Jatuh tempo: {loan.dueDate}</p>
                    <div className="flex gap-2 mt-2">
                      <button className="flex-1 text-xs border border-gray-300 text-gray-700 rounded-lg py-1.5 hover:bg-gray-50 transition">
                        Buku Hilang?
                      </button>
                      <button className="flex-1 text-xs bg-teal-600 text-white rounded-lg py-1.5 flex items-center justify-center gap-1 hover:bg-teal-700 transition">
                        <MessageCircle size={12} />
                        Kirim Pengingat WA
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </Section>

          {/* Volunteer Applications */}
          <Section
            title="Calon Relawan Baru"
            count={applications.length}
            countColor="bg-blue-100 text-blue-700"
          >
            {applications.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Tidak ada pendaftar baru</p>
            ) : (
              applications.map((app) => (
                <div key={app.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {app.avatarInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{app.name}</p>
                      <p className="text-xs text-gray-500 truncate">{app.education} · {app.institution}</p>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-700 font-medium px-2 py-0.5 rounded-full whitespace-nowrap">
                      {app.division}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 text-xs border border-blue-500 text-blue-600 rounded-lg py-1.5 hover:bg-blue-50 transition flex items-center justify-center gap-1">
                      <FileText size={12} />
                      Tinjau Berkas
                    </button>
                    <button
                      onClick={() => handleApproveApplication(app.id)}
                      disabled={approvingId === app.id}
                      className="flex-1 text-xs bg-blue-600 text-white rounded-lg py-1.5 hover:bg-blue-700 transition flex items-center justify-center gap-1 disabled:opacity-60"
                    >
                      <UserCheck size={12} />
                      {approvingId === app.id ? 'Memproses...' : 'Setujui Relawan'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </Section>

          {/* Shift Verification */}
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-gray-900 text-sm">Verifikasi Jam Piket</h2>
                <span className="text-xs bg-orange-100 text-orange-700 font-medium px-2 py-0.5 rounded-full">
                  {shifts.filter((s) => !s.approved).length} Pending
                </span>
              </div>
              <button
                onClick={handleApproveAll}
                disabled={approveAllLoading}
                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition flex items-center gap-1 disabled:opacity-60"
              >
                {approveAllLoading ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                Setujui Semua
              </button>
            </div>

            {/* Weekly stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-blue-700">
                  {shifts.reduce((acc, s) => acc + parseFloat(s.duration || '0'), 0).toFixed(0)} jam
                </p>
                <p className="text-xs text-gray-500">Total Jam</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-emerald-700">
                  {shifts.length > 0
                    ? Math.round((shifts.filter((s) => s.approved).length / shifts.length) * 100)
                    : 0}%
                </p>
                <p className="text-xs text-gray-500">Terpenuhi</p>
              </div>
            </div>

            {shifts.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2">Tidak ada shift pending</p>
            ) : (
              <div className="space-y-2">
                {shifts.map((shift) => (
                  <div
                    key={shift.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50"
                  >
                    <button
                      onClick={() => !shift.approved && handleApproveShift(shift.id)}
                      className="flex-shrink-0"
                    >
                      {shift.approved ? (
                        <CheckSquare size={20} className="text-blue-600" />
                      ) : (
                        <Square size={20} className="text-gray-400" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{shift.volunteerName}</p>
                      <p className="text-xs text-gray-500">{shift.role}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-medium text-gray-700">{shift.duration} jam</p>
                      <p className="text-xs text-gray-400">{shift.startTime} – {shift.endTime}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audit Logs */}
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-gray-600" />
              <h2 className="font-semibold text-gray-900 text-sm">Audit Aktivitas Sistem</h2>
              <span className="text-xs bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse inline-block" />
                Live Feed
              </span>
            </div>
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : auditLogs.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Belum ada log aktivitas</p>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3">
                    <span
                      className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0"
                      style={{ backgroundColor: log.color || '#6b7280' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">{log.title}</p>
                        <p className="text-xs text-gray-400 flex-shrink-0">{log.timeAgo}</p>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{log.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  sub,
  subColor,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  subColor: string;
  bg: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 space-y-1">
      <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center`}>{icon}</div>
      <p className="text-xs text-gray-500 mt-2">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className={`text-xs font-medium ${subColor}`}>{sub}</p>
    </div>
  );
}

function Section({
  title,
  count,
  countColor,
  children,
}: {
  title: string;
  count: number;
  countColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="font-semibold text-gray-900 text-sm">{title}</h2>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${countColor}`}>
          {count}
        </span>
      </div>
      {children}
    </div>
  );
}
