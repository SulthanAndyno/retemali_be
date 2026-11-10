'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  HelpCircle,
  Clock,
  LogOut,
  LogIn,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Ticket,
  QrCode,
  Scan,
  Camera,
  Check,
  Package,
  Inbox,
  FileEdit,
  CloudCheck,
  Send,
  Plus
} from 'lucide-react';
import { get, post, patch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface VolunteerDashboardData {
  activeShift?: {
    id: string;
    shiftType: string;
    location: string;
    clockInAt: string;
    user: { name: string };
  };
  todayStats?: {
    borrowedCount: number;
    returnedCount: number;
    overdueCount: number;
    checkedInTickets: number;
    totalTickets: number;
  };
  activeEvent?: {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    registeredCount: number;
    checkedInCount: number;
  };
  pendingDonations?: Array<{
    id: string;
    donorName: string;
    donorBadge?: string;
    totalBooks: number;
    packageTitle: string;
    conditionNote: string;
    createdAt: string;
  }>;
}

export default function VolunteerDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [dashboardData, setDashboardData] = useState<VolunteerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [circulationTab, setCirculationTab] = useState<'checkout' | 'return'>('checkout');

  // Circulation form state
  const [memberCode, setMemberCode] = useState('');
  const [bookCode, setBookCode] = useState('');
  const [circulationLoading, setCirculationLoading] = useState(false);

  // Shift timer state
  const [durationString, setDurationString] = useState('02 : 49 : 16');
  const [isClockedIn, setIsClockedIn] = useState(true);
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);

  // Ticket scan state
  const [ticketCodeInput, setTicketCodeInput] = useState('');
  const [showTicketInput, setShowTicketInput] = useState(false);
  const [ticketLoading, setTicketLoading] = useState(false);

  // Handover notes state
  const [noteContent, setNoteContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [noteSaving, setNoteSaving] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Live timer for shift duration
  useEffect(() => {
    const startTime = Date.now() - (2 * 3600 + 49 * 60 + 16) * 1000;
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - startTime) / 1000);
      const hrs = String(Math.floor(diff / 3600)).padStart(2, '0');
      const mins = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
      const secs = String(diff % 60).padStart(2, '0');
      setDurationString(`${hrs} : ${mins} : ${secs}`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await get<{ data: VolunteerDashboardData }>('/dashboard/volunteer');
      if (res && res.data) {
        setDashboardData(res.data);
        if (res.data.activeShift) {
          setIsClockedIn(true);
          setActiveShiftId(res.data.activeShift.id);
        }
      }
    } catch {
      // Offline fallback mock data matching the screenshot
      setDashboardData({
        todayStats: {
          borrowedCount: 18,
          returnedCount: 14,
          overdueCount: 0,
          checkedInTickets: 34,
          totalTickets: 45,
        },
        activeEvent: {
          id: 'ev-1',
          title: 'Kelas Mendongeng Ceria',
          startTime: '10:00',
          endTime: '11:30',
          registeredCount: 45,
          checkedInCount: 34,
        },
        pendingDonations: [
          {
            id: 'don-1',
            donorName: 'Budi Santoso',
            donorBadge: 'Warga RW 14',
            totalBooks: 25,
            packageTitle: '25 Buku Sains Populer',
            conditionNote: 'Kondisi Baik',
            createdAt: '09:15 WIB',
          },
          {
            id: 'don-2',
            donorName: 'Titipan Drop-box Pagi',
            donorBadge: 'Anonim',
            totalBooks: 11,
            packageTitle: '8 Komik Anak Edukasi & 3 Majalah',
            conditionNote: 'Layak Baca',
            createdAt: '08:45 WIB',
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  // Clock In / Clock Out
  const handleToggleClock = async () => {
    try {
      if (isClockedIn) {
        await patch('/volunteers/shifts/clock-out');
        setIsClockedIn(false);
        showToast('Shift selesai. Clock-Out berhasil dicatat!');
      } else {
        await post('/volunteers/shifts/clock-in', {
          shiftType: 'SHIFT_PAGI',
          location: 'RT 05 RW 14 Jatirangga • Pos Utama',
        });
        setIsClockedIn(true);
        showToast('Selamat bertugas! Clock-In berhasil dicatat.');
      }
      loadDashboard();
    } catch (err: unknown) {
      const error = err as Error;
      showToast(error.message || 'Gagal mengubah status shift', 'error');
    }
  };

  // Quick circulation submission
  const handleCirculationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (circulationTab === 'checkout' && (!memberCode.trim() || !bookCode.trim())) {
      showToast('Masukkan ID Anggota dan Kode Buku', 'error');
      return;
    }
    if (circulationTab === 'return' && !bookCode.trim()) {
      showToast('Masukkan Kode Buku yang dikembalikan', 'error');
      return;
    }

    try {
      setCirculationLoading(true);
      if (circulationTab === 'checkout') {
        await post('/circulation/quick-checkout', {
          memberCode: memberCode.trim(),
          bookCode: bookCode.trim(),
        });
        showToast(`Peminjaman buku ${bookCode} untuk anggota ${memberCode} BERHASIL!`);
        setBookCode('');
      } else {
        await post('/circulation/quick-return', {
          bookCode: bookCode.trim(),
          returnCondition: 'GOOD',
        });
        showToast(`Pengembalian buku ${bookCode} berhasil diterima!`);
        setBookCode('');
      }
      loadDashboard();
    } catch (err: unknown) {
      const error = err as Error;
      showToast(error.message || 'Gagal memproses sirkulasi cepat', 'error');
    } finally {
      setCirculationLoading(false);
    }
  };

  // Ticket check-in
  const handleTicketCheckIn = async () => {
    if (!ticketCodeInput.trim()) {
      showToast('Masukkan Kode E-Tiket Peserta', 'error');
      return;
    }
    try {
      setTicketLoading(true);
      await post('/events/check-in', { ticketCode: ticketCodeInput.trim() });
      showToast(`Presensi tiket ${ticketCodeInput} berhasil diverifikasi!`);
      setTicketCodeInput('');
      setShowTicketInput(false);
      loadDashboard();
    } catch (err: unknown) {
      const error = err as Error;
      showToast(error.message || 'Tiket tidak valid atau sudah check-in', 'error');
    } finally {
      setTicketLoading(false);
    }
  };

  // Verify book donation
  const handleVerifyDonation = async (id: string, name: string) => {
    try {
      await patch(`/donations/books/${id}/verify`, { status: 'ACCEPTED' });
      showToast(`Batch donasi dari ${name} telah diverifikasi & diterima!`);
      setDashboardData((prev) =>
        prev
          ? {
              ...prev,
              pendingDonations: prev.pendingDonations?.filter((d) => d.id !== id),
            }
          : prev
      );
    } catch {
      showToast('Gagal memverifikasi donasi', 'error');
    }
  };

  // Submit handover notes
  const handleSaveNotes = async () => {
    if (!noteContent.trim()) {
      showToast('Tuliskan catatan terlebih dahulu', 'error');
      return;
    }
    try {
      setNoteSaving(true);
      await post('/volunteers/handover-notes', {
        shiftType: 'SHIFT_PAGI',
        tags: selectedTags,
        content: noteContent.trim(),
      });
      showToast('Catatan kendala & logistik piket berhasil disimpan!');
      setNoteContent('');
      setSelectedTags([]);
    } catch {
      showToast('Gagal menyimpan catatan piket', 'error');
    } finally {
      setNoteSaving(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-blue-50/60 pb-16 text-slate-800">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold ${
            toast.type === 'success' ? 'bg-blue-600 text-white' : 'bg-rose-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Top Header */}
      <header className="bg-white px-4 py-3 shadow-xs flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="p-1.5 -ml-1.5 rounded-full hover:bg-slate-100 text-slate-700"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-tight">Operasional Relawan</h1>
            <p className="text-[11px] text-slate-500 leading-tight">Rete Mali Community</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
            <HelpCircle size={19} />
          </button>
          <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold flex items-center justify-center">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'RL'}
          </div>
        </div>
      </header>

      <main className="px-4 pt-3 space-y-3.5">
        {/* Active Shift Card */}
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100/80">
          <div className="flex items-center justify-between mb-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Shift Pagi (09:00 – 14:00 WIB)</span>
            </div>

            <div className="flex items-center gap-1">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-bold flex items-center justify-center">
                RD
              </span>
              <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-[9px] font-bold flex items-center justify-center -ml-2">
                BL
              </span>
              <span className="text-[10px] text-slate-500 font-medium ml-1">2 Bertugas</span>
            </div>
          </div>

          <h2 className="text-base font-extrabold text-slate-900 leading-tight">
            Meja Operasional Relawan
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            RT 05 RW 14 Jatirangga • Pos Utama
          </p>

          <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 mt-3 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-800">
                {user?.name || 'Rifky D.'} <span className="text-blue-600 font-semibold">(Koor)</span> &amp; Bunga L.
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
                <Clock size={13} className="text-blue-600" />
                <span>Durasi:</span>
                <span className="font-mono font-bold text-slate-900">{durationString}</span>
              </div>
            </div>

            <button
              onClick={handleToggleClock}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 ${
                isClockedIn
                  ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              {isClockedIn ? (
                <>
                  <LogOut size={13} />
                  <span>Clock-Out</span>
                </>
              ) : (
                <>
                  <LogIn size={13} />
                  <span>Clock-In</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* 4 Metric Chips (2x2 grid) */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-white rounded-2xl p-3 border border-blue-50 shadow-xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <BookOpen size={19} />
            </div>
            <div>
              <p className="text-base font-extrabold text-slate-900 leading-tight">
                {dashboardData?.todayStats?.borrowedCount ?? 18}
              </p>
              <p className="text-[11px] text-slate-500 leading-tight">Buku Dipinjam</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3 border border-blue-50 shadow-xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 size={19} />
            </div>
            <div>
              <p className="text-base font-extrabold text-slate-900 leading-tight">
                {dashboardData?.todayStats?.returnedCount ?? 14}
              </p>
              <p className="text-[11px] text-slate-500 leading-tight">Dikembalikan</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3 border border-blue-50 shadow-xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <CheckCircle2 size={19} />
            </div>
            <div>
              <p className="text-base font-extrabold text-slate-900 leading-tight">
                {dashboardData?.todayStats?.overdueCount ?? 0}
              </p>
              <p className="text-[11px] text-slate-500 leading-tight">Terlambat/Denda</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3 border border-blue-50 shadow-xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <Ticket size={19} />
            </div>
            <div>
              <p className="text-base font-extrabold text-slate-900 leading-tight">
                {dashboardData?.todayStats?.checkedInTickets ?? 34}
                <span className="text-xs text-slate-400 font-normal">
                  /{dashboardData?.todayStats?.totalTickets ?? 45}
                </span>
              </p>
              <p className="text-[11px] text-slate-500 leading-tight">Tiket Hadir</p>
            </div>
          </div>
        </div>

        {/* Section: Sirkulasi Cepat */}
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Scan size={18} className="text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Sirkulasi Cepat</h3>
            </div>
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
              Katalog Aktif
            </span>
          </div>

          {/* Subtabs: Peminjaman Baru vs Pengembalian */}
          <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl gap-1">
            <button
              onClick={() => setCirculationTab('checkout')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                circulationTab === 'checkout'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Peminjaman Baru
            </button>
            <button
              onClick={() => setCirculationTab('return')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                circulationTab === 'return'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pengembalian
            </button>
          </div>

          <form onSubmit={handleCirculationSubmit} className="space-y-2.5">
            {circulationTab === 'checkout' && (
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <label className="font-semibold text-slate-700">ID / Barcode Anggota</label>
                  <button
                    type="button"
                    onClick={() => setMemberCode('RM-2024-0188')}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    ✧ Auto-Fill Demo
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Contoh: RM-2024-0188"
                    value={memberCode}
                    onChange={(e) => setMemberCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-16 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setMemberCode('RM-2024-0188')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold flex items-center gap-1"
                  >
                    <Scan size={12} /> Scan
                  </button>
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <label className="font-semibold text-slate-700">Kode Barcode / ISBN Buku</label>
                <button
                  type="button"
                  onClick={() => setBookCode('BK-FA-0042')}
                  className="text-blue-600 hover:underline font-medium"
                >
                  Koleksi Rete Mali
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Contoh: BK-FA-0042 atau 978602..."
                  value={bookCode}
                  onChange={(e) => setBookCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-16 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setBookCode('BK-FA-0042')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold flex items-center gap-1"
                >
                  <Camera size={12} /> Scan
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={circulationLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors disabled:opacity-50 mt-1"
            >
              <Check size={16} />
              <span>{circulationLoading ? 'Memproses...' : 'Proses Sirkulasi Instan'}</span>
            </button>
          </form>
        </section>

        {/* Section: Presensi Kegiatan Warga */}
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100/80 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <QrCode size={18} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 leading-tight">
                  Presensi Kegiatan Warga
                </h3>
                <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                  Kelas Mendongeng Ceria • 10:00 - 11:30
                </p>
              </div>
            </div>

            <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              Sesi Berjalan
            </span>
          </div>

          {/* Attendance progress bar */}
          <div className="space-y-1.5 bg-blue-50/50 p-2.5 rounded-xl border border-blue-100/50">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-700">Kehadiran Peserta</span>
              <span className="text-blue-700">34 / 45 Orang (76%)</span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full w-[76%]" />
            </div>
            <p className="text-[10px] text-slate-500 flex items-center gap-1">
              <span>ⓘ 11 tiket belum check-in di gerbang taman baca</span>
            </p>
          </div>

          {/* Quick scan / manual code */}
          {showTicketInput ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Kode Tiket (RETEMALI-EV-XXXX)"
                value={ticketCodeInput}
                onChange={(e) => setTicketCodeInput(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
              />
              <button
                onClick={handleTicketCheckIn}
                disabled={ticketLoading}
                className="px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
              >
                {ticketLoading ? '...' : 'Presensi'}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTicketInput(true)}
                className="flex-1 py-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 active:bg-blue-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Camera size={15} />
                <span>Pindai QR Tiket Peserta</span>
              </button>
              <button
                onClick={() => setShowTicketInput(true)}
                className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200"
              >
                <QrCode size={16} />
              </button>
            </div>
          )}
        </section>

        {/* Section: Verifikasi Donasi Masuk */}
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Package size={17} className="text-amber-500" />
              <h3 className="text-xs font-bold text-slate-900">Verifikasi Donasi Masuk</h3>
            </div>
            <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center">
              2
            </span>
          </div>
          <p className="text-[11px] text-slate-500 -mt-1">2 batch perlu kurasi relawan</p>

          <div className="space-y-2.5">
            {/* Donation item 1 */}
            <div className="bg-blue-50/50 border border-blue-100/80 rounded-xl p-3 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <Inbox size={15} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-slate-900">Budi Santoso</p>
                      <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-medium">
                        Warga RW 14
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">25 Buku Sains Populer • Kondisi Baik</p>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400">09:15 WIB</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button className="px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">
                  Periksa Detail
                </button>
                <button
                  onClick={() => handleVerifyDonation('don-1', 'Budi Santoso')}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg shadow-xs flex items-center gap-1"
                >
                  <Check size={12} /> Terima
                </button>
              </div>
            </div>

            {/* Donation item 2 */}
            <div className="bg-blue-50/50 border border-blue-100/80 rounded-xl p-3 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                    <Package size={15} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-slate-900">Titipan Drop-box Pagi</p>
                      <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-medium">
                        Anonim
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">8 Komik Anak Edukasi &amp; 3 Majalah</p>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400">08:45 WIB</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button className="px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">
                  Periksa Detail
                </button>
                <button
                  onClick={() => handleVerifyDonation('don-2', 'Titipan Drop-box')}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg shadow-xs flex items-center gap-1"
                >
                  <Check size={12} /> Terima
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Catatan Kendala & Logistik Piket */}
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100/80 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
              <FileEdit size={18} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 leading-tight">
                Catatan Kendala &amp; Logistik Piket
              </h3>
              <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                Diserahkan otomatis untuk Shift Siang (14:00)
              </p>
            </div>
          </div>

          {/* Quick Tag Pills */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleTag('Stok Sanitizer Tipis')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedTags.includes('Stok Sanitizer Tipis')
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              + Stok Sanitizer Tipis
            </button>
            <button
              onClick={() => toggleTag('Rak Ensiklopedia Rapi')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedTags.includes('Rak Ensiklopedia Rapi')
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              + Rak Ensiklopedia Rapi
            </button>
          </div>

          {/* Note Input */}
          <textarea
            rows={3}
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Tulis catatan pergantian shift, temuan buku rusak, atau kebutuhan logistik pos jaga..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 resize-none"
          />

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
              <CloudCheck size={14} className="text-emerald-500" />
              <span>Auto-draft tersimpan</span>
            </span>

            <button
              onClick={handleSaveNotes}
              disabled={noteSaving}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Send size={13} />
              <span>{noteSaving ? 'Menyimpan...' : 'Simpan Catatan'}</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
