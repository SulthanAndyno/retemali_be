'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  User,
  QrCode,
  BookOpen,
  Calendar,
  Bookmark,
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  X,
  Award,
  Heart,
  ChevronRight,
  ShieldCheck,
  Send
} from 'lucide-react';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import { get, patch, post } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/lib/utils';

interface LoanItem {
  id: string;
  loanCode: string;
  book: {
    id: string;
    title: string;
    author: string;
    shelfLocation: string;
  };
  borrowedAt: string;
  dueDate: string;
  extendedCount: number;
  status: 'BORROWED' | 'RETURNED' | 'OVERDUE' | 'LOST';
}

interface ReservationItem {
  id: string;
  reservationCode: string;
  book: {
    id: string;
    title: string;
    author: string;
  };
  pickupCounter: string;
  expiresAt: string;
  status: 'READY_FOR_PICKUP' | 'CLAIMED' | 'EXPIRED' | 'CANCELLED';
}

interface TicketItem {
  id: string;
  ticketCode: string;
  event: {
    id: string;
    title: string;
    eventDate: string;
    startTime: string;
    endTime: string;
    location: string;
  };
  status: 'REGISTERED' | 'CHECKED_IN' | 'CANCELLED';
}

interface BookmarkItem {
  id: string;
  book: {
    id: string;
    title: string;
    author: string;
    shelfLocation: string;
    availableStock: number;
  };
}

export default function MemberDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [loans, setLoans] = useState<LoanItem[]>([]);
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Volunteer apply modal
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [majorOrJob, setMajorOrJob] = useState('');
  const [institution, setInstitution] = useState('');
  const [division, setDivision] = useState('Kelas Cerita');
  const [motivation, setMotivation] = useState('');
  const [applyLoading, setApplyLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadMemberData = async () => {
    try {
      setLoading(true);
      const [loansRes, resRes, tixRes, bmarkRes] = await Promise.allSettled([
        get<{ data: LoanItem[] }>('/circulation/loans/me'),
        get<{ data: ReservationItem[] }>('/circulation/reservations/me'),
        get<{ data: TicketItem[] }>('/events/tickets/me'),
        get<{ data: BookmarkItem[] }>('/books/bookmarks/me'),
      ]);

      if (loansRes.status === 'fulfilled' && loansRes.value?.data) {
        setLoans(loansRes.value.data);
      }
      if (resRes.status === 'fulfilled' && resRes.value?.data) {
        setReservations(resRes.value.data);
      }
      if (tixRes.status === 'fulfilled' && tixRes.value?.data) {
        setTickets(tixRes.value.data);
      }
      if (bmarkRes.status === 'fulfilled' && bmarkRes.value?.data) {
        setBookmarks(bmarkRes.value.data);
      }
    } catch {
      // Sample fallback
      setLoans([
        {
          id: 'loan-1',
          loanCode: 'PJ-2026-004',
          book: {
            id: 'b-1',
            title: 'Filosofi Teras',
            author: 'Henry Manampiring',
            shelfLocation: 'Rak B-04',
          },
          borrowedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
          dueDate: new Date(Date.now() + 4 * 86400000).toISOString(),
          extendedCount: 0,
          status: 'BORROWED',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMemberData();
  }, []);

  const handleExtendLoan = async (loanId: string) => {
    try {
      await patch(`/circulation/loans/${loanId}/extend`);
      showToast('Masa pinjam berhasil diperpanjang +7 Hari!');
      loadMemberData();
    } catch (err: unknown) {
      const error = err as Error;
      showToast(error.message || 'Batas maksimal perpanjangan telah tercapai', 'error');
    }
  };

  const handleCancelReservation = async (reservationId: string) => {
    try {
      await patch(`/circulation/reservations/${reservationId}/cancel`);
      showToast('Reservasi berhasil dibatalkan');
      loadMemberData();
    } catch {
      showToast('Gagal membatalkan reservasi', 'error');
    }
  };

  const handleApplyVolunteer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!majorOrJob.trim() || !institution.trim() || !motivation.trim()) {
      showToast('Mohon lengkapi seluruh formulir', 'error');
      return;
    }
    try {
      setApplyLoading(true);
      await post('/volunteers/apply', {
        majorOrJob,
        institution,
        division,
        motivation,
      });
      showToast('Pendaftaran relawan berhasil dikirim! Menunggu persetujuan admin.');
      setShowApplyModal(false);
    } catch (err: unknown) {
      const error = err as Error;
      showToast(error.message || 'Gagal mendaftar relawan', 'error');
    } finally {
      setApplyLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-blue-50/50 pb-24 text-slate-800">
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

      {/* Header */}
      <Header title="Dashboard Member" subtitle="Kartu & Layanan Anggota" showBack />

      <main className="px-4 pt-3 space-y-4">
        {/* Digital Member Card */}
        <section className="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 rounded-2xl p-4 text-white shadow-md relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] tracking-widest text-blue-200 uppercase font-bold">
                Kartu Anggota Digital
              </p>
              <h2 className="text-lg font-extrabold mt-0.5">{user?.name || 'Warga Rete Mali'}</h2>
              <p className="text-xs text-blue-200 font-mono mt-0.5">
                {user?.memberCode || '#RM-2024-0188'}
              </p>
            </div>

            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/20">
              <QrCode size={22} className="text-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-white/15 text-xs">
            <div>
              <span className="text-[10px] text-blue-200">Poin Literasi</span>
              <p className="font-extrabold text-sm">{user?.points ?? 120} Pts</p>
            </div>
            <div>
              <span className="text-[10px] text-blue-200">Target Baca Tahunan</span>
              <p className="font-extrabold text-sm">{user?.readingTarget ?? 20} Buku</p>
            </div>
          </div>
        </section>

        {/* Section: Pinjaman Buku Aktif */}
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100/70 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <BookOpen size={16} className="text-blue-600" />
              <h3 className="text-xs font-bold text-slate-900">Pinjaman Buku Aktif</h3>
            </div>
            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
              {loans.filter((l) => l.status === 'BORROWED').length} Buku
            </span>
          </div>

          {loans.length === 0 ? (
            <p className="text-xs text-slate-500 py-2 text-center">
              Tidak ada buku yang sedang dipinjam saat ini.
            </p>
          ) : (
            <div className="space-y-2.5">
              {loans.map((loan) => (
                <div
                  key={loan.id}
                  className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 flex items-start justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-mono font-bold">
                      {loan.loanCode}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 leading-tight">
                      {loan.book?.title}
                    </h4>
                    <p className="text-[11px] text-slate-500">{loan.book?.author}</p>
                    <p className="text-[10px] text-slate-600 pt-1 flex items-center gap-1">
                      <Clock size={11} className="text-amber-500" />
                      <span>Jatuh Tempo: {formatDate(loan.dueDate)}</span>
                    </p>
                  </div>

                  <button
                    onClick={() => handleExtendLoan(loan.id)}
                    className="px-2.5 py-1.5 bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 rounded-lg text-[11px] font-bold shadow-xs shrink-0 flex items-center gap-1"
                  >
                    <RotateCw size={11} /> +7 Hari
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section: Reservasi Buku */}
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100/70 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Clock size={16} className="text-amber-500" />
              <h3 className="text-xs font-bold text-slate-900">Reservasi Siap Ambil</h3>
            </div>
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              {reservations.length} Reservasi
            </span>
          </div>

          {reservations.length === 0 ? (
            <p className="text-xs text-slate-500 py-2 text-center">
              Belum ada reservasi aktif.
            </p>
          ) : (
            <div className="space-y-2">
              {reservations.map((res) => (
                <div
                  key={res.id}
                  className="bg-amber-50/50 border border-amber-100 rounded-xl p-3 flex items-start justify-between"
                >
                  <div>
                    <span className="text-[9px] bg-amber-200/80 text-amber-900 px-1.5 py-0.2 rounded font-mono font-bold">
                      {res.reservationCode}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 mt-0.5">{res.book?.title}</h4>
                    <p className="text-[11px] text-slate-600">Ambil di: {res.pickupCounter}</p>
                    <p className="text-[10px] text-amber-700 font-medium">
                      Batas ambil: {formatDate(res.expiresAt)}
                    </p>
                  </div>

                  <button
                    onClick={() => handleCancelReservation(res.id)}
                    className="text-xs text-rose-600 hover:underline font-semibold"
                  >
                    Batalkan
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section: E-Tiket Kegiatan */}
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100/70 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Calendar size={16} className="text-blue-600" />
              <h3 className="text-xs font-bold text-slate-900">E-Tiket Kegiatan Komunitas</h3>
            </div>
          </div>

          {tickets.length === 0 ? (
            <p className="text-xs text-slate-500 py-2 text-center">
              Belum mendaftar kegiatan apa pun.
            </p>
          ) : (
            <div className="space-y-2">
              {tickets.map((tix) => (
                <div
                  key={tix.id}
                  className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-mono bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-bold">
                      {tix.ticketCode}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900">{tix.event?.title}</h4>
                    <p className="text-[11px] text-slate-600">
                      {tix.event?.eventDate ? formatDate(tix.event.eventDate) : 'Sabtu'} •{' '}
                      {tix.event?.startTime} - {tix.event?.endTime} WIB
                    </p>
                  </div>

                  <div className="w-9 h-9 rounded-lg bg-white border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                    <QrCode size={20} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Apply as Volunteer banner */}
        <section className="bg-gradient-to-r from-teal-700 to-emerald-700 rounded-2xl p-4 text-white shadow-sm flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] text-teal-200 font-bold uppercase tracking-wider">
              Program Relawan
            </p>
            <h3 className="text-sm font-extrabold mt-0.5">Ingin Mengabdi Jadi Relawan?</h3>
            <p className="text-[11px] text-teal-100 mt-0.5">
              Daftar sesi mengajar anak, kurasi sirkulasi, atau pemandu kelas.
            </p>
          </div>
          <button
            onClick={() => setShowApplyModal(true)}
            className="px-3.5 py-2 bg-white text-teal-800 rounded-xl text-xs font-bold shrink-0 hover:bg-teal-50 shadow-sm"
          >
            Daftar
          </button>
        </section>
      </main>

      {/* Volunteer Application Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl space-y-3.5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Form Pendaftaran Relawan</h3>
              <button
                onClick={() => setShowApplyModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleApplyVolunteer} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Profesi / Jurusan Kuliah
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Sastra Indonesia / Guru SD"
                  value={majorOrJob}
                  onChange={(e) => setMajorOrJob(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Instansi / Universitas
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Universitas Indonesia"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Pilihan Divisi</label>
                <select
                  value={division}
                  onChange={(e) => setDivision(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                >
                  <option value="Kelas Cerita">Kelas Cerita &amp; Dongeng</option>
                  <option value="Teknologi IT">Teknologi IT &amp; Inventaris</option>
                  <option value="Bimbingan Baca">Bimbingan Belajar &amp; Baca</option>
                  <option value="Sirkulasi Pos">Sirkulasi &amp; Pos Jaga</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Motivasi</label>
                <textarea
                  rows={3}
                  placeholder="Ceritakan motivasi Anda bergabung dengan Komunitas Rete Mali..."
                  value={motivation}
                  onChange={(e) => setMotivation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={applyLoading}
                className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Send size={14} />
                <span>{applyLoading ? 'Mengirim...' : 'Kirim Berkas Pendaftaran'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <BottomNav />
    </div>
  );
}
