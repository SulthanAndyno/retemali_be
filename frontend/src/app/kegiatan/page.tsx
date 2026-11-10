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
  UserCheck
} from 'lucide-react';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import { get, post } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate, getImageUrl } from '@/lib/utils';

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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
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
  }, []);

  const handleRegister = async (event: EventItem) => {
    if (!user) {
      router.push('/login');
      return;
    }
    try {
      setRegisteringId(event.id);
      await post(`/events/${event.id}/register`);
      showToast(`Pendaftaran acara "${event.title}" BERHASIL! E-Tiket diterbitkan.`);
      setEvents((prev) =>
        prev.map((e) =>
          e.id === event.id
            ? { ...e, isRegistered: true, registeredCount: e.registeredCount + 1 }
            : e
        )
      );
    } catch (err: unknown) {
      const error = err as Error;
      showToast(error.message || 'Gagal mendaftar acara', 'error');
    } finally {
      setRegisteringId(null);
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
          <div className="flex items-center gap-1.5 text-blue-600 mb-1">
            <Sparkles size={16} />
            <span className="text-xs font-bold tracking-wider uppercase">Agenda Literasi</span>
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
            const seatsLeft = Math.max(0, event.quota - event.registeredCount);
            return (
              <div
                key={event.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-blue-100/70 hover:shadow-md transition-shadow"
              >
                {/* Banner Placeholder or Image */}
                <div className="relative h-44 w-full bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 flex flex-col justify-end p-4 text-white">
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
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

                    <span className="font-bold text-rose-600">
                      • Sisa {seatsLeft} Kursi
                    </span>
                  </div>

                  {/* Register CTA */}
                  <button
                    onClick={() => handleRegister(event)}
                    disabled={registeringId === event.id || event.isRegistered || seatsLeft === 0}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all ${
                      event.isRegistered
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : seatsLeft === 0
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
                            : seatsLeft === 0
                            ? 'Kuota Habis'
                            : 'Daftar Sekarang (Gratis)'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
