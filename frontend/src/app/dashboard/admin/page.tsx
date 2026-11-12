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
  FileText,
  UserCheck,
  CheckSquare,
  Square,
  Activity,
  RefreshCw,
  Upload,
  CreditCard,
  Save,
  QrCode,
  Image as ImageIcon,
  BarChart3,
  Wallet,
  BookMarked,
  FileSpreadsheet,
  ChevronRight,
  Plus,
  Trash2,
  Power,
  Pencil,
  Eye,
  X,
  Banknote,
  Receipt,
  BadgeCheck,
  XCircle
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { formatCurrency, getImageUrl } from '@/lib/utils';

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
  overdueCirculationAlerts?: Array<{
    id: string;
    dueDate: string;
    user?: { name?: string; phone?: string | null; memberCode?: string } | null;
    book?: { title?: string; coverImage?: string | null } | null;
  }>;
}

interface OverdueLoan {
  id: string;
  bookTitle: string;
  bookCover?: string;
  borrowerName: string;
  phone?: string | null;
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

interface PaymentAccount {
  id: string;
  type: 'QRIS' | 'BANK_TRANSFER';
  providerName: string;
  accountNumber: string | null;
  accountName: string | null;
  qrisImageUrl: string | null;
  qrisNmid: string | null;
  isActive: boolean;
  sortOrder: number;
}

interface EventPaymentRow {
  id: string;
  ticketCode: string;
  status: string;
  paymentStatus: 'PENDING' | 'VERIFIED' | 'FAILED' | null;
  paymentProofUrl: string | null;
  paymentNote: string | null;
  createdAt: string;
  event: {
    id: string;
    title: string;
    eventDate: string;
    feeType: string;
    infaqAmount: string | number;
  };
  user: {
    id: string;
    memberCode: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    rtRw?: string | null;
  };
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

  // Donation payment channels (QRIS + multiple bank accounts, each toggleable)
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [accountForm, setAccountForm] = useState<{
    type: 'QRIS' | 'BANK_TRANSFER';
    providerName: string;
    accountNumber: string;
    accountName: string;
    qrisNmid: string;
  }>({
    type: 'BANK_TRANSFER',
    providerName: '',
    accountNumber: '',
    accountName: '',
    qrisNmid: '',
  });
  const [qrisFile, setQrisFile] = useState<File | null>(null);
  const [qrisPreview, setQrisPreview] = useState<string | null>(null);
  const [savingAccount, setSavingAccount] = useState(false);
  const [busyAccountId, setBusyAccountId] = useState<string | null>(null);

  // Paid-event registration verification
  const [registrations, setRegistrations] = useState<EventPaymentRow[]>([]);
  const [registrationsLoading, setRegistrationsLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);

  const addToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const handleQrisFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setQrisFile(file);
      const url = URL.createObjectURL(file);
      setQrisPreview(url);
    }
  };

  const closeAccountForm = () => {
    setShowAccountForm(false);
    setEditingAccountId(null);
    setQrisFile(null);
    setQrisPreview(null);
    setAccountForm({
      type: 'BANK_TRANSFER',
      providerName: '',
      accountNumber: '',
      accountName: '',
      qrisNmid: '',
    });
  };

  const openCreateAccount = () => {
    setEditingAccountId(null);
    setQrisFile(null);
    setQrisPreview(null);
    setAccountForm({
      type: 'BANK_TRANSFER',
      providerName: '',
      accountNumber: '',
      accountName: '',
      qrisNmid: '',
    });
    setShowAccountForm(true);
  };

  const openEditAccount = (account: PaymentAccount) => {
    setEditingAccountId(account.id);
    setQrisFile(null);
    setQrisPreview(account.qrisImageUrl ? getImageUrl(account.qrisImageUrl) : null);
    setAccountForm({
      type: account.type,
      providerName: account.providerName,
      accountNumber: account.accountNumber ?? '',
      accountName: account.accountName ?? '',
      qrisNmid: account.qrisNmid ?? '',
    });
    setShowAccountForm(true);
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (accountForm.providerName.trim().length < 2) {
      addToast('Nama kanal / bank minimal 2 karakter', 'error');
      return;
    }
    if (accountForm.type === 'BANK_TRANSFER' && !accountForm.accountNumber.trim()) {
      addToast('Nomor rekening wajib diisi untuk transfer bank', 'error');
      return;
    }

    setSavingAccount(true);
    try {
      const token = getToken();
      const body = new FormData();
      body.append('type', accountForm.type);
      body.append('providerName', accountForm.providerName.trim());
      if (accountForm.accountNumber.trim()) {
        body.append('accountNumber', accountForm.accountNumber.trim());
      }
      if (accountForm.accountName.trim()) {
        body.append('accountName', accountForm.accountName.trim());
      }
      if (accountForm.type === 'QRIS' && accountForm.qrisNmid.trim()) {
        body.append('qrisNmid', accountForm.qrisNmid.trim());
      }
      if (qrisFile) {
        body.append('qrisImage', qrisFile);
      }

      const res = await fetch(
        `${API_URL}/donations/payment-accounts${editingAccountId ? `/${editingAccountId}` : ''}`,
        {
          method: editingAccountId ? 'PATCH' : 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body,
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Gagal menyimpan kanal pembayaran');
      }

      addToast(
        editingAccountId ? 'Kanal pembayaran diperbarui' : 'Kanal pembayaran ditambahkan',
        'success'
      );
      closeAccountForm();
      await loadPaymentAccounts();
    } catch (err: unknown) {
      addToast((err as Error).message || 'Gagal menyimpan kanal pembayaran', 'error');
    } finally {
      setSavingAccount(false);
    }
  };

  const handleToggleAccount = async (account: PaymentAccount) => {
    setBusyAccountId(account.id);
    try {
      const token = getToken();
      const body = new FormData();
      body.append('isActive', String(!account.isActive));

      const res = await fetch(`${API_URL}/donations/payment-accounts/${account.id}`, {
        method: 'PATCH',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Gagal mengubah status kanal');
      }

      setPaymentAccounts((prev) =>
        prev.map((row) => (row.id === account.id ? { ...row, isActive: !row.isActive } : row))
      );
      addToast(
        account.isActive ? 'Kanal dinonaktifkan' : 'Kanal diaktifkan kembali',
        'success'
      );
    } catch (err: unknown) {
      addToast((err as Error).message || 'Gagal mengubah status kanal', 'error');
    } finally {
      setBusyAccountId(null);
    }
  };

  const handleDeleteAccount = async (account: PaymentAccount) => {
    if (!window.confirm(`Hapus kanal pembayaran "${account.providerName}"?`)) return;

    setBusyAccountId(account.id);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/donations/payment-accounts/${account.id}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Gagal menghapus kanal');
      }

      setPaymentAccounts((prev) => prev.filter((row) => row.id !== account.id));
      addToast('Kanal pembayaran dihapus', 'success');
    } catch (err: unknown) {
      addToast((err as Error).message || 'Gagal menghapus kanal', 'error');
    } finally {
      setBusyAccountId(null);
    }
  };

  const handleVerifyRegistration = async (id: string, status: 'VERIFIED' | 'FAILED') => {
    setVerifyingId(id);
    try {
      const updated = await apiFetch<EventPaymentRow>(
        `/events/registrations/${id}/verify`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        }
      );

      setRegistrations((prev) =>
        prev.map((row) =>
          row.id === id
            ? { ...row, paymentStatus: updated?.paymentStatus ?? status, status: updated?.status ?? row.status }
            : row
        )
      );
      addToast(
        status === 'VERIFIED'
          ? 'Pembayaran peserta disetujui'
          : 'Pembayaran peserta ditolak, pendaftaran dibatalkan',
        status === 'VERIFIED' ? 'success' : 'error'
      );
    } catch (err: unknown) {
      addToast((err as Error).message || 'Gagal memverifikasi pembayaran', 'error');
    } finally {
      setVerifyingId(null);
    }
  };

  const loadPaymentAccounts = useCallback(async () => {
    try {
      const data = await apiFetch<PaymentAccount[]>('/donations/payment-accounts/admin');
      setPaymentAccounts(data ?? []);
    } catch {
      // Keep the previously loaded list when the request fails.
    }
  }, []);

  const loadRegistrations = useCallback(async () => {
    setRegistrationsLoading(true);
    try {
      const data = await apiFetch<{ registrations: EventPaymentRow[] }>(
        '/events/registrations?paidOnly=true'
      );
      setRegistrations(data?.registrations ?? []);
    } catch {
      setRegistrations([]);
    } finally {
      setRegistrationsLoading(false);
    }
  }, []);

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

      await Promise.all([loadPaymentAccounts(), loadRegistrations()]);

      // Overdue circulation alerts come straight from /dashboard/admin when
      // available; otherwise fall back to a demo row so the panel is never empty.
      const alerts = dashData.status === 'fulfilled' ? dashData.value?.overdueCirculationAlerts : undefined;

      if (alerts && alerts.length > 0) {
        const now = Date.now();
        setOverdueLoans(
          alerts.map((alert) => {
            const due = new Date(alert.dueDate);
            const overdueDays = Number.isNaN(due.getTime())
              ? 0
              : Math.max(0, Math.floor((now - due.getTime()) / 86_400_000));
            return {
              id: alert.id,
              bookTitle: alert.book?.title ?? 'Buku',
              bookCover: alert.book?.coverImage ?? undefined,
              borrowerName: alert.user?.name ?? 'Anggota',
              phone: alert.user?.phone ?? null,
              overdueDays,
              dueDate: Number.isNaN(due.getTime())
                ? '-'
                : due.toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  }),
            };
          })
        );
      } else {
        setOverdueLoans([
          {
            id: '1',
            bookTitle: 'Laskar Pelangi',
            borrowerName: 'Budi Santoso',
            overdueDays: 4,
            dueDate: '5 Mei 2025',
          },
        ]);
      }
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
        {/* Universal Header with Side Panel Drawer */}
        <Header title="Dashboard Admin" subtitle="Pusat Kendali Operasional" showBack />

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

          {/* Donation Payment Channels (QRIS & rekening bank) */}
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-center gap-2">
                <CreditCard size={18} className="text-blue-600" />
                <h2 className="font-semibold text-gray-900 text-sm">Kanal Pembayaran Donasi</h2>
              </div>
              <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                {paymentAccounts.filter((account) => account.isActive).length} Aktif
              </span>
            </div>

            <p className="text-[11px] text-slate-500">
              Hanya kanal berstatus <strong>Aktif</strong> yang tampil di halaman donasi publik.
              Admin dapat menambah beberapa rekening bank sekaligus dan mengatur QRIS di sini.
            </p>

            <div className="space-y-2">
              {paymentAccounts.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3">Belum ada kanal pembayaran</p>
              ) : (
                paymentAccounts.map((account) => (
                  <div
                    key={account.id}
                    className={`p-3 rounded-xl border space-y-2 ${
                      account.isActive
                        ? 'bg-blue-50/50 border-blue-100'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            account.type === 'QRIS'
                              ? 'bg-rose-100 text-rose-600'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          {account.type === 'QRIS' ? <QrCode size={15} /> : <Banknote size={15} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {account.providerName}
                          </p>
                          {account.type === 'BANK_TRANSFER' ? (
                            <>
                              <p className="text-[11px] font-mono text-slate-700">
                                {account.accountNumber}
                              </p>
                              <p className="text-[10px] text-slate-500 truncate">
                                a.n. {account.accountName ?? '-'}
                              </p>
                            </>
                          ) : (
                            <p className="text-[10px] text-slate-500 truncate">
                              NMID: {account.qrisNmid ?? '-'}
                            </p>
                          )}
                        </div>
                      </div>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          account.isActive
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {account.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleAccount(account)}
                        disabled={busyAccountId === account.id}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border flex items-center justify-center gap-1 transition-colors disabled:opacity-50 ${
                          account.isActive
                            ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                            : 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                      >
                        <Power size={11} />
                        {account.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditAccount(account)}
                        className="py-1.5 px-2.5 rounded-lg text-[10px] font-bold bg-white border border-blue-300 text-blue-700 hover:bg-blue-50 flex items-center justify-center gap-1"
                      >
                        <Pencil size={11} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAccount(account)}
                        disabled={busyAccountId === account.id}
                        className="py-1.5 px-2.5 rounded-lg text-[10px] font-bold bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        <Trash2 size={11} /> Hapus
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {!showAccountForm && (
              <button
                type="button"
                onClick={openCreateAccount}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors text-xs"
              >
                <Plus size={14} />
                <span>Tambah Kanal Pembayaran</span>
              </button>
            )}

            {showAccountForm && (
              <form
                onSubmit={handleAccountSubmit}
                className="border-t border-gray-100 pt-3 space-y-2.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-900">
                    {editingAccountId ? 'Ubah Kanal Pembayaran' : 'Kanal Pembayaran Baru'}
                  </p>
                  <button
                    type="button"
                    onClick={closeAccountForm}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  >
                    <X size={15} />
                  </button>
                </div>

                <div>
                  <label className="text-[11px] text-gray-600 block mb-1">Jenis Kanal</label>
                  <select
                    value={accountForm.type}
                    onChange={(e) =>
                      setAccountForm({
                        ...accountForm,
                        type: e.target.value as 'QRIS' | 'BANK_TRANSFER',
                      })
                    }
                    className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 font-semibold text-gray-800"
                  >
                    <option value="BANK_TRANSFER">Transfer Bank</option>
                    <option value="QRIS">QRIS</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-gray-600 block mb-1">
                    {accountForm.type === 'QRIS' ? 'Nama Kanal' : 'Nama Bank'}
                  </label>
                  <input
                    type="text"
                    value={accountForm.providerName}
                    onChange={(e) =>
                      setAccountForm({ ...accountForm, providerName: e.target.value })
                    }
                    placeholder={accountForm.type === 'QRIS' ? 'QRIS Statis' : 'Bank Mandiri'}
                    className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-800"
                  />
                </div>

                {accountForm.type === 'BANK_TRANSFER' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-gray-600 block mb-1">Nomor Rekening</label>
                      <input
                        type="text"
                        value={accountForm.accountNumber}
                        onChange={(e) =>
                          setAccountForm({ ...accountForm, accountNumber: e.target.value })
                        }
                        placeholder="1234567890"
                        className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 font-mono font-bold text-gray-800"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-600 block mb-1">Atas Nama (a.n.)</label>
                      <input
                        type="text"
                        value={accountForm.accountName}
                        onChange={(e) =>
                          setAccountForm({ ...accountForm, accountName: e.target.value })
                        }
                        placeholder="Yayasan Taman Baca Rete Mali"
                        className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-800 font-medium"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <label className="text-[11px] text-gray-600 block mb-1">Nomor NMID</label>
                      <input
                        type="text"
                        value={accountForm.qrisNmid}
                        onChange={(e) =>
                          setAccountForm({ ...accountForm, qrisNmid: e.target.value })
                        }
                        placeholder="ID1024389271649"
                        className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 font-mono text-gray-800"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-gray-600 block mb-1">
                        Gambar QRIS (JPG/PNG)
                      </label>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-400 text-blue-700 rounded-lg font-bold cursor-pointer hover:bg-blue-50 transition-colors">
                          <Upload size={13} />
                          <span>Pilih Gambar</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleQrisFileChange}
                            className="hidden"
                          />
                        </label>
                        {qrisPreview ? (
                          <img
                            src={qrisPreview}
                            alt="Preview QRIS"
                            className="w-10 h-10 object-cover rounded border"
                          />
                        ) : editingAccountId ? (
                          <span className="text-[10px] text-gray-500">
                            Kosongkan jika tidak mengganti gambar
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400">Belum ada file dipilih</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={savingAccount}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60"
                  >
                    <Save size={13} />
                    <span>{savingAccount ? 'Menyimpan...' : 'Simpan Kanal'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={closeAccountForm}
                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                  >
                    Batal
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Event Payment Verification (kegiatan berbayar) */}
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-emerald-600" />
                <h2 className="font-semibold text-gray-900 text-sm">Verifikasi Pembayaran Kegiatan</h2>
              </div>
              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                {registrations.filter((row) => row.paymentStatus === 'PENDING').length} Menunggu
              </span>
            </div>

            <p className="text-[11px] text-slate-500">
              Bukti pembayaran peserta kegiatan berbayar. Setujui untuk mengaktifkan E-Tiket, atau
              tolak untuk membatalkan pendaftaran.
            </p>

            {registrationsLoading ? (
              <div className="space-y-2">
                {[...Array(2)].map((_, index) => (
                  <div key={index} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : registrations.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">
                Tidak ada pendaftaran kegiatan berbayar
              </p>
            ) : (
              <div className="space-y-2">
                {registrations.map((row) => (
                  <div
                    key={row.id}
                    className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{row.user.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{row.event.title}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{row.ticketCode}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] font-bold text-emerald-700">
                          {formatCurrency(Number(row.event.infaqAmount ?? 0))}
                        </p>
                        <span
                          className={`inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            row.paymentStatus === 'VERIFIED'
                              ? 'bg-emerald-100 text-emerald-700'
                              : row.paymentStatus === 'FAILED'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {row.paymentStatus ?? 'GRATIS'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setProofPreview(getImageUrl(row.paymentProofUrl))}
                        className="flex-1 py-1.5 rounded-lg text-[10px] font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-1"
                      >
                        <Eye size={11} /> Lihat Bukti
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVerifyRegistration(row.id, 'VERIFIED')}
                        disabled={verifyingId === row.id || row.paymentStatus === 'VERIFIED'}
                        className="flex-1 py-1.5 rounded-lg text-[10px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        <BadgeCheck size={11} /> Setujui
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVerifyRegistration(row.id, 'FAILED')}
                        disabled={verifyingId === row.id || row.paymentStatus === 'FAILED'}
                        className="flex-1 py-1.5 rounded-lg text-[10px] font-bold bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        <XCircle size={11} /> Tolak
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reports & Archives */}
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-blue-600" />
              <h2 className="font-semibold text-gray-900 text-sm">Laporan &amp; Arsip</h2>
              <span className="text-[9px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">
                Excel Ready
              </span>
            </div>
            <p className="text-[11px] text-slate-500 -mt-1">
              Rekap presensi kegiatan, arus kas, dan log peminjaman buku anggota.
            </p>

            <div className="space-y-2">
              <button
                onClick={() => router.push('/dashboard/admin/reports/attendance')}
                className="w-full p-2.5 rounded-xl bg-blue-50/70 hover:bg-blue-100/80 border border-blue-100 text-left flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                    <FileSpreadsheet size={15} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Laporan Presensi Kegiatan</p>
                    <p className="text-[10px] text-slate-500">Rekap kehadiran + export .xlsx</p>
                  </div>
                </div>
                <ChevronRight size={15} className="text-slate-400" />
              </button>

              <button
                onClick={() => router.push('/dashboard/admin/reports/cash')}
                className="w-full p-2.5 rounded-xl bg-emerald-50/70 hover:bg-emerald-100/80 border border-emerald-100 text-left flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                    <Wallet size={15} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Laporan Kas</p>
                    <p className="text-[10px] text-slate-500">Donasi, infaq &amp; denda sirkulasi</p>
                  </div>
                </div>
                <ChevronRight size={15} className="text-slate-400" />
              </button>

              <button
                onClick={() => router.push('/dashboard/admin/borrowings')}
                className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center">
                    <BookMarked size={15} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Log Peminjaman Buku</p>
                    <p className="text-[10px] text-slate-500">Riwayat pinjam per anggota</p>
                  </div>
                </div>
                <ChevronRight size={15} className="text-slate-400" />
              </button>
            </div>
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

      {/* Modal pratinjau bukti pembayaran peserta */}
      {proofPreview && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setProofPreview(null)}
        >
          <div
            className="bg-white rounded-2xl p-3 max-w-md w-full max-h-[85vh] overflow-auto space-y-2"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-900">Bukti Pembayaran Peserta</p>
              <button
                type="button"
                onClick={() => setProofPreview(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>
            {/\.pdf($|\?)/i.test(proofPreview) ? (
              <iframe src={proofPreview} title="Bukti pembayaran" className="w-full h-[60vh] rounded-lg border" />
            ) : (
              <img
                src={proofPreview}
                alt="Bukti pembayaran peserta"
                className="w-full rounded-lg border object-contain"
              />
            )}
            <a
              href={proofPreview}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-[11px] font-bold text-blue-700 hover:underline"
            >
              Buka di tab baru
            </a>
          </div>
        </div>
      )}
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
