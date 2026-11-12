'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  Sparkles,
  Ticket,
  Search,
  ChevronRight,
  UserCheck,
  Plus,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import { get, patch, del } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate, getImageUrl } from '@/lib/utils';
import {
  computeEventTimeline,
  computeQuotaState,
  TONE_BAR_CLASSES,
  TONE_CLASSES,
  type EventPhase,
  type EventTone,
} from '@/lib/events';

interface EventItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  facilitatorName: string;
  location: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  quota: number;
  registeredCount: number;
  feeType: 'FREE' | 'INFAQ';
  infaqAmount?: number;
  bannerImage?: string;
  isRegistered?: boolean;
  status?: string;
}

interface AutoCloseState {
  id: string;
  phase: EventPhase;
  label: string;
  isRegistrationOpen: boolean;
  isAutoClosed: boolean;
  closedReason: string | null;
  seatsLeft: number;
  isQuotaFull: boolean;
  quotaPercent: number;
}

const categories = [
  { id: 'ALL', label: 'Semua Acara' },
  { id: 'DONGENG', label: 'Festival Dongeng' },
  { id: 'ANAK', label: 'Kelas Anak' },
  { id: 'SAINS', label: 'Sains Kreatif' },
  { id: 'KLUB_BUKU', label: 'Klub Buku Warga' },
  { id: 'UMUM', label: 'Umum' },
];

export default function KegiatanPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [registeringId, setRegisteringId] = useState<string | null>(null);
  const [registerTarget, setRegisterTarget] = useState<EventItem | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [autoClose, setAutoClose] = useState<Record<string, AutoCloseState>>({});

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  /**
   * Server-side timeline evaluation (auto-closing). Falls back silently to the
   * local `computeEventTimeline` helper if the endpoint is unreachable.
   */
  const syncAutoClose = async () => {
    try {
      const response = await fetch('/api/events/auto-close', { cache: 'no-store' });
      if (!response.ok) return;
      const payload = (await response.json()) as { data?: { events?: AutoCloseState[] } };
      const map: Record<string, AutoCloseState> = {};
      (payload.data?.events ?? []).forEach((item) => {
        map[item.id] = item;
      });
      setAutoClose(map);
    } catch {
      // Local computation in getEventState keeps the UI correct.
    }
  };

  const getEventState = (event: EventItem) => {
    const local = computeEventTimeline(event);
    const server = autoClose[event.id];

    return {
      timeline: server
        ? {
            phase: server.phase,
            label: server.label,
            isRegistrationOpen: server.isRegistrationOpen,
            isAutoClosed: server.isAutoClosed,
            closedReason: server.closedReason,
          }
        : {
            phase: local.phase,
            label: local.label,
            isRegistrationOpen: local.isRegistrationOpen,
            isAutoClosed: local.isAutoClosed,
            closedReason: local.closedReason,
          },
      quota: computeQuotaState(event.quota, event.registeredCount),
    };
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await get<{ data: EventItem[] }>('/events');
      if (res && res.data) {
        setEvents(res.data);
      }
    } catch {
      // Mock events matching the UI screenshot
      setEvents([
        {
          id: 'ev-1',
          title: 'Festival Dongeng Nusantara & Panggung Boneka',
          slug: 'festival-dongeng-nusantara',
          description:
            'Keseruan mendengarkan kisah petualangan Si Kancil dan dongeng nusantara dibawakan oleh Kak Dini bersama boneka tangan interaktif di Saung Baca Rete Mali.',
          category: 'DONGENG',
          facilitatorName: 'Kak Dini & Tim Teater Boneka',
          location: 'Saung Rete Mali, Jatirangga',
          eventDate: new Date(Date.now() + 5 * 86400000).toISOString(),
          startTime: '10:00',
          endTime: '12:00',
          quota: 45,
          registeredCount: 39,
          feeType: 'FREE',
          bannerImage: '',
        },
        {
          id: 'ev-2',
          title: 'Eksperimen Roket Air & Planetarium Mini',
          slug: 'eksperimen-roket-air',
          description:
            'Workshop sains interaktif untuk anak usia 7-12 tahun. Mempelajari tekanan udara, fisika dasar gaya dorong, dan simulasi tata surya.',
          category: 'SAINS',
          facilitatorName: 'Rian Pratama (Relawan IT)',
          location: 'Halaman Terbuka RT 05 RW 14',
          eventDate: new Date(Date.now() + 12 * 86400000).toISOString(),
          startTime: '08:30',
          endTime: '11:00',
          quota: 30,
          registeredCount: 22,
          feeType: 'FREE',
        },
        {
          id: 'ev-3',
          title: 'Klub Diskusi Buku Warga: Filosofi Teras & Ketenangan Batin',
          slug: 'klub-buku-filosofi-teras',
          description:
            'Sesi bedah buku santai ditemani kopi rempah lokal. Membahas penerapan dikotomi kendali dalam meredakan stres pekerjaan dan keluarga.',
          category: 'KLUB_BUKU',
          facilitatorName: 'Budi Santoso & Pengurus RW',
          location: 'Bale Pertemuan Warga',
          eventDate: new Date(Date.now() + 18 * 86400000).toISOString(),
          startTime: '19:30',
          endTime: '21:30',
          quota: 25,
          registeredCount: 15,
          feeType: 'FREE',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    syncAutoClose();
  }, []);

  /** Kegiatan berbayar = infaq dengan nominal > 0 (wajib bukti pembayaran). */
  const isPaidEvent = (event: EventItem) =>
    event.feeType === 'INFAQ' && Number(event.infaqAmount ?? 0) > 0;

  const submitRegistration = async (event: EventItem, proof?: File) => {
    try {
      setRegisteringId(event.id);
      const token = typeof window !== 'undefined' ? localStorage.getItem('retemali_token') : null;
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

      let body: FormData | undefined;
      if (proof) {
        body = new FormData();
        body.append('paymentProof', proof);
      }

      const res = await fetch(`${API_URL}/events/${event.id}/register`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body,
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.message || 'Gagal mendaftar acara');
      }

      const isPending = payload?.data?.paymentStatus === 'PENDING';
      showToast(
        isPending
          ? `Pendaftaran "${event.title}" diterima. Bukti pembayaran menunggu verifikasi admin.`
          : `Pendaftaran acara "${event.title}" BERHASIL! E-Tiket diterbitkan.`
      );
      setEvents((prev) =>
        prev.map((e) =>
          e.id === event.id
            ? { ...e, isRegistered: true, registeredCount: e.registeredCount + 1 }
            : e
        )
      );
      setRegisterTarget(null);
      setProofFile(null);
      setProofPreview(null);
    } catch (err: unknown) {
      const error = err as Error;
      showToast(error.message || 'Gagal mendaftar acara', 'error');
    } finally {
      setRegisteringId(null);
    }
  };

  const handleRegister = (event: EventItem) => {
    if (!user) {
      router.push('/login');
      return;
    }
    // Kegiatan berbayar: buka formulir unggah bukti pembayaran terlebih dahulu.
    if (isPaidEvent(event)) {
      setProofFile(null);
      setProofPreview(null);
      setRegisterTarget(event);
      return;
    }
    void submitRegistration(event);
  };

  const handleProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFile(file);
    setProofPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
  };

  // Admin CRUD Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    category: 'DONGENG',
    description: '',
    facilitatorName: '',
    location: 'Saung Baca Rete Mali, Jatirangga',
    eventDate: '',
    startTime: '09:00',
    endTime: '11:30',
    quota: 30,
    feeType: 'FREE' as 'FREE' | 'INFAQ',
    infaqAmount: 0,
  });

  // Admin quota guard: a quota can never be lowered below current registrations.
  const quotaFloor = editingEvent ? Math.max(1, editingEvent.registeredCount) : 1;

  const openCreateModal = () => {
    setEditingEvent(null);
    setBannerFile(null);
    setBannerPreview(null);
    setFormData({
      title: '',
      category: 'DONGENG',
      description: '',
      facilitatorName: '',
      location: 'Saung Baca Rete Mali, Jatirangga',
      eventDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '11:30',
      quota: 30,
      feeType: 'FREE',
      infaqAmount: 0,
    });
    setShowModal(true);
  };

  const openEditModal = (event: EventItem) => {
    setEditingEvent(event);
    setBannerFile(null);
    setBannerPreview(event.bannerImage ? getImageUrl(event.bannerImage) : null);
    const dateStr = event.eventDate ? new Date(event.eventDate).toISOString().split('T')[0] : '';
    setFormData({
      title: event.title || '',
      category: event.category || 'DONGENG',
      description: event.description || '',
      facilitatorName: event.facilitatorName || '',
      location: event.location || 'Saung Baca Rete Mali, Jatirangga',
      eventDate: dateStr,
      startTime: event.startTime || '09:00',
      endTime: event.endTime || '11:30',
      quota: event.quota || 30,
      feeType: event.feeType || 'FREE',
      infaqAmount: event.infaqAmount || 0,
    });
    setShowModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.title.trim().length < 5) {
      showToast('Judul kegiatan minimal 5 karakter', 'error');
      return;
    }
    if (formData.description.trim().length < 10) {
      showToast('Deskripsi kegiatan minimal 10 karakter', 'error');
      return;
    }
    if (!formData.eventDate) {
      showToast('Pilih tanggal kegiatan', 'error');
      return;
    }
    if (!Number.isFinite(formData.quota) || formData.quota < 1) {
      showToast('Kuota peserta minimal 1 orang', 'error');
      return;
    }
    if (editingEvent && formData.quota < quotaFloor) {
      showToast(
        `Kuota tidak boleh kurang dari ${quotaFloor} — sudah ada ${editingEvent.registeredCount} peserta terdaftar`,
        'error'
      );
      return;
    }

    try {
      setModalSubmitting(true);
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title.trim());
      formDataToSend.append('category', formData.category);
      formDataToSend.append('description', formData.description.trim());
      formDataToSend.append('facilitatorName', formData.facilitatorName.trim() || 'Tim Literasi Rete Mali');
      formDataToSend.append('location', formData.location.trim() || 'Saung Baca Rete Mali, Jatirangga');
      formDataToSend.append('eventDate', new Date(formData.eventDate).toISOString());
      formDataToSend.append('startTime', formData.startTime);
      formDataToSend.append('endTime', formData.endTime);
      formDataToSend.append('quota', String(formData.quota));
      formDataToSend.append('feeType', formData.feeType);
      formDataToSend.append('infaqAmount', String(formData.feeType === 'INFAQ' ? formData.infaqAmount : 0));
      if (bannerFile) {
        formDataToSend.append('bannerImage', bannerFile);
      }

      const token = typeof window !== 'undefined' ? localStorage.getItem('retemali_token') : null;
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const url = `${API_URL}/events${editingEvent ? `/${editingEvent.id}` : ''}`;
      const res = await fetch(url, {
        method: editingEvent ? 'PATCH' : 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formDataToSend,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Gagal menyimpan kegiatan');
      }

      showToast(editingEvent ? 'Kegiatan berhasil diperbarui!' : 'Kegiatan baru berhasil diterbitkan!');
      setShowModal(false);
      fetchEvents();
    } catch (err: unknown) {
      const error = err as Error;
      showToast(error.message || 'Gagal menyimpan kegiatan', 'error');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDeleteEvent = async (id: string, title: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus kegiatan "${title}"?`)) {
      return;
    }
    try {
      setDeletingId(id);
      await del(`/events/${id}`);
      showToast('Kegiatan berhasil dihapus');
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (err: unknown) {
      const error = err as Error;
      showToast(error.message || 'Gagal menghapus kegiatan', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredEvents =
    activeCategory === 'ALL'
      ? events
      : events.filter((e) => e.category === activeCategory);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-blue-50/50 pb-24 text-slate-800">
      {/* Toast */}
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
      <Header />

      <main className="px-4 pt-3 space-y-4">
        {/* Banner Section */}
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-blue-600 mb-1">
              <Sparkles size={16} />
              <span className="text-xs font-bold tracking-wider uppercase">Agenda Literasi</span>
            </div>
            {user?.role === 'ADMIN' && (
              <button
                onClick={openCreateModal}
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs transition-colors"
              >
                <Plus size={14} />
                <span>Tambah Kegiatan</span>
              </button>
            )}
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 leading-tight">
            Kegiatan Komunitas
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Ajak adik dan tetangga berkumpul seru. Seluruh kegiatan terbuka untuk warga Betawi Permai &amp; Jatirangga.
          </p>
        </section>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Event List */}
        <div className="space-y-4">
          {filteredEvents.map((event) => {
            const { timeline, quota } = getEventState(event);
            const isClosed = !timeline.isRegistrationOpen;
            return (
              <div
                key={event.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-blue-100/70 hover:shadow-md transition-shadow"
              >
                {/* Banner Placeholder or Image */}
                <div className="relative h-48 w-full bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 flex flex-col justify-end p-4 text-white overflow-hidden">
                  {event.bannerImage && (
                    <img
                      src={getImageUrl(event.bannerImage)}
                      alt={event.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                  {/* Subtle dark gradient overlay so text remains readable */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/40 to-transparent" />

                  <div className="relative z-10">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="bg-amber-400 text-amber-950 font-bold text-[10px] px-2.5 py-0.5 rounded-full shadow-xs">
                        Pekan Ini
                      </span>
                      <span className="bg-emerald-500 text-white font-bold text-[10px] px-2.5 py-0.5 rounded-full shadow-xs">
                        {event.feeType === 'FREE' ? 'Gratis' : 'Infaq Sukarela'}
                      </span>
                    </div>

                    <p className="text-[11px] text-blue-200 flex items-center gap-1 font-medium mb-1">
                      <Calendar size={13} />
                      <span>
                        {formatDate(event.eventDate)} • {event.startTime} - {event.endTime} WIB
                      </span>
                    </p>
                    <h3 className="text-base font-extrabold leading-snug drop-shadow-xs line-clamp-2">
                      {event.title}
                    </h3>
                  </div>
                </div>

                {/* Event Details Body */}
                <div className="p-4 space-y-3">
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                    {event.description}
                  </p>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-1 text-slate-600">
                      <MapPin size={13} className="text-blue-600" />
                      <span>{event.location}</span>
                    </div>

                    <span
                      className={`font-bold ${quota.isFull ? 'text-rose-600' : 'text-slate-600'}`}
                    >
                      • {quota.label}
                    </span>
                  </div>

                  {/* Quota progress + automated-closing state */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-semibold">
                      <span className="text-slate-600">
                        {quota.registered} / {quota.quota} peserta terdaftar
                      </span>
                      <div className="flex items-center gap-1">
                        {timeline.isAutoClosed && (
                          <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-full font-bold">
                            Ditutup Otomatis
                          </span>
                        )}
                        <span
                          className={`px-1.5 py-0.5 rounded-full font-bold ${
                            TONE_CLASSES[quota.tone as EventTone] ?? 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {quota.isFull ? 'Kuota Penuh' : `${quota.percent}%`}
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          TONE_BAR_CLASSES[quota.tone as EventTone] ?? 'bg-slate-400'
                        }`}
                        style={{ width: `${quota.percent}%` }}
                      />
                    </div>
                    {isClosed && timeline.closedReason && (
                      <p className="text-[10px] text-slate-500 leading-snug flex items-start gap-1">
                        <AlertCircle size={11} className="mt-0.5 shrink-0" />
                        {timeline.closedReason}
                      </p>
                    )}
                  </div>

                  {/* Register CTA */}
                  <button
                    onClick={() => handleRegister(event)}
                    disabled={registeringId === event.id || event.isRegistered || isClosed || quota.isFull}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all ${
                      event.isRegistered
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : isClosed || quota.isFull
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white'
                    }`}
                  >
                    {event.isRegistered ? (
                      <>
                        <CheckCircle2 size={15} />
                        <span>Terdaftar (Lihat E-Tiket di Portal)</span>
                      </>
                    ) : (
                      <>
                        <Ticket size={15} />
                        <span>
                          {registeringId === event.id
                            ? 'Menerbitkan Tiket...'
                            : isClosed
                            ? 'Pendaftaran Ditutup'
                            : quota.isFull
                            ? 'Kuota Habis'
                            : isPaidEvent(event)
                            ? `Daftar (Infaq ${formatCurrency(Number(event.infaqAmount ?? 0))})`
                            : 'Daftar Sekarang (Gratis)'}
                        </span>
                      </>
                    )}
                  </button>

                  {/* Admin Controls */}
                  {user?.role === 'ADMIN' && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => openEditModal(event)}
                        className="flex-1 py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                      >
                        <Edit2 size={13} className="text-blue-600" />
                        <span>Edit Kegiatan</span>
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(event.id, event.title)}
                        disabled={deletingId === event.id}
                        className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={13} className="text-rose-600" />
                        <span>{deletingId === event.id ? 'Menghapus...' : 'Hapus'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Modal CRUD Event (Khusus Admin) */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingEvent ? 'Edit Agenda Kegiatan' : 'Tambah Agenda Baru'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Judul Acara / Kegiatan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Festival Dongeng Akhir Pekan"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kategori *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="DONGENG">Festival Dongeng</option>
                    <option value="ANAK">Kelas Anak</option>
                    <option value="SAINS">Sains Kreatif</option>
                    <option value="KLUB_BUKU">Klub Buku Warga</option>
                    <option value="MENULIS">Kelas Menulis</option>
                    <option value="UMUM">Umum</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kuota Peserta *</label>
                  <input
                    type="number"
                    min={quotaFloor}
                    required
                    value={formData.quota}
                    onChange={(e) => setFormData({ ...formData, quota: Number(e.target.value) })}
                    className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 ${
                      formData.quota < quotaFloor
                        ? 'border-rose-300 focus:ring-rose-500'
                        : 'border-slate-200 focus:ring-blue-500'
                    }`}
                  />
                  {editingEvent && editingEvent.registeredCount > 0 && (
                    <p
                      className={`text-[10px] mt-1 leading-snug ${
                        formData.quota < quotaFloor ? 'text-rose-600 font-semibold' : 'text-slate-500'
                      }`}
                    >
                      {formData.quota < quotaFloor
                        ? `Kuota tidak boleh di bawah ${quotaFloor} (peserta terdaftar).`
                        : `${editingEvent.registeredCount} peserta sudah terdaftar. Sisa ${
                            formData.quota - editingEvent.registeredCount
                          } kursi.`}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nama Fasilitator / Pemateri *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kak Dini & Tim Teater Boneka"
                  value={formData.facilitatorName}
                  onChange={(e) => setFormData({ ...formData, facilitatorName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Lokasi Pelaksanaan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Saung Rete Mali, Jatirangga"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tanggal *</label>
                  <input
                    type="date"
                    required
                    value={formData.eventDate}
                    onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Mulai *</label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Selesai *</label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Biaya Acara</label>
                  <select
                    value={formData.feeType}
                    onChange={(e) => setFormData({ ...formData, feeType: e.target.value as 'FREE' | 'INFAQ' })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="FREE">Gratis (Free)</option>
                    <option value="INFAQ">Infaq Sukarela</option>
                  </select>
                </div>
                {formData.feeType === 'INFAQ' && (
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Saran Infaq (Rp)</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.infaqAmount}
                      onChange={(e) => setFormData({ ...formData, infaqAmount: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Deskripsi Kegiatan *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ceritakan detail kegiatan, kelompok usia sasaran, dan materi seru yang akan dipelajari..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Upload Banner / Poster Kegiatan */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Upload Poster / Banner Kegiatan
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl font-bold cursor-pointer transition-colors shadow-2xs">
                    <Upload size={14} className="text-blue-600" />
                    <span>Pilih Gambar Poster</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setBannerFile(file);
                          setBannerPreview(URL.createObjectURL(file));
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  {bannerPreview ? (
                    <div className="flex items-center gap-2">
                      <div className="relative w-16 h-10 rounded-lg overflow-hidden border border-slate-200 shadow-2xs">
                        <img src={bannerPreview} alt="Preview Banner" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-[11px] text-emerald-600 font-bold">Poster siap</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400">Belum ada gambar dipilih</span>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-50"
                >
                  {modalSubmitting ? 'Menyimpan...' : editingEvent ? 'Simpan Perubahan' : 'Terbitkan Acara'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pendaftaran Kegiatan Berbayar (wajib bukti pembayaran) */}
      {registerTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-start justify-between border-b pb-3 border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Pendaftaran Kegiatan Berbayar
                </h3>
                <p className="text-[11px] text-slate-500">{registerTarget.title}</p>
              </div>
              <button
                onClick={() => setRegisterTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs space-y-1">
              <p className="font-bold text-amber-900 flex items-center gap-1.5">
                <Ticket size={14} />
                Infaq Peserta: {formatCurrency(Number(registerTarget.infaqAmount ?? 0))}
              </p>
              <p className="text-[11px] text-amber-800 leading-snug">
                Silakan transfer ke rekening/QRIS resmi Rete Mali (lihat halaman Donasi), lalu
                unggah bukti pembayaran di bawah ini. Pendaftaran akan aktif setelah admin
                memverifikasi bukti tersebut.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-semibold text-slate-700 block">
                Bukti Pembayaran (JPG, PNG, atau PDF) *
              </label>
              <label className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-blue-300 rounded-xl text-blue-700 font-bold bg-blue-50/60 cursor-pointer hover:bg-blue-50 transition-colors">
                <Upload size={15} />
                <span>{proofFile ? 'Ganti File' : 'Pilih File Bukti Pembayaran'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleProofChange}
                  className="hidden"
                />
              </label>

              {proofFile && (
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2">
                  {proofPreview ? (
                    <img
                      src={proofPreview}
                      alt="Pratinjau bukti pembayaran"
                      className="w-10 h-10 rounded object-cover border"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-slate-200 flex items-center justify-center text-slate-500">
                      <ImageIcon size={16} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-800 truncate">
                      {proofFile.name}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {(proofFile.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                </div>
              )}

              <p className="text-[10px] text-slate-400">
                Maksimal 2 MB. Bukti pembayaran disimpan sebagai referensi verifikasi admin.
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRegisterTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => registerTarget && submitRegistration(registerTarget, proofFile ?? undefined)}
                disabled={!proofFile || registeringId === registerTarget.id}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 size={15} />
                {registeringId === registerTarget.id ? 'Mengirim...' : 'Kirim & Daftar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
