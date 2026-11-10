'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Menu,
  Bell,
  User,
  Search,
  MapPin,
  Calendar,
  BookOpen,
  Users,
  Heart,
  ChevronRight,
  QrCode,
  X,
  ExternalLink,
  MessageSquare,
  Mail,
  Camera,
  Clock,
  Sparkles,
  Bookmark
} from 'lucide-react';
import BottomNav from '@/components/layout/BottomNav';
import { get } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { getImageUrl } from '@/lib/utils';

interface PopularBook {
  id: string;
  bookCode?: string;
  title: string;
  author: string;
  category: string;
  status: 'AVAILABLE' | 'BORROWED';
  rating?: number | string;
  coverImage?: string;
  isBookmarked?: boolean;
}

const categories = ['Semua', 'Fiksi & Sastra', 'Sains & Fakta', 'Sejarah'];

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [bookCount, setBookCount] = useState(3450);
  const [memberCount, setMemberCount] = useState(1280);

  const [popularBooks, setPopularBooks] = useState<PopularBook[]>([
    {
      id: '1',
      title: 'Laskar Pelangi',
      author: 'Andrea Hirata',
      category: 'FIKSI',
      status: 'AVAILABLE',
      rating: 4.9,
    },
    {
      id: '2',
      title: 'Bumi Manusia',
      author: 'Pramoedya A. Toer',
      category: 'SEJARAH',
      status: 'BORROWED',
      rating: 5.0,
    },
    {
      id: '3',
      title: 'Filosofi Teras',
      author: 'Henry Manampiring',
      category: 'PSIKOLOGI',
      status: 'AVAILABLE',
      rating: 4.9,
    },
    {
      id: '4',
      title: 'Sains Populer Anak',
      author: 'Tim Sains Nusantara',
      category: 'EDUKASI ANAK',
      status: 'AVAILABLE',
      rating: 4.8,
    },
  ]);

  useEffect(() => {
    setMounted(true);

    const loadPublicData = async () => {
      try {
        const res = await get<{
          data: {
            bookCount?: number;
            memberCount?: number;
            popularBooks?: PopularBook[];
          };
        }>('/dashboard/public');

        if (res && res.data) {
          if (res.data.bookCount) setBookCount(res.data.bookCount);
          if (res.data.memberCount) setMemberCount(res.data.memberCount);
          if (res.data.popularBooks && res.data.popularBooks.length > 0) {
            setPopularBooks(res.data.popularBooks);
          }
        }
      } catch {
        // Fallback to sample data matching UI
      }
    };

    loadPublicData();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/katalog?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/katalog');
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-blue-50/50 pb-24 text-slate-800 relative">
      {/* Top Header matching UI */}
      <header className="bg-white px-4 py-3 shadow-xs sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMenuOpen(true)}
            className="p-1 -ml-1 text-slate-700 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Menu"
          >
            <Menu size={22} />
          </button>
          <div>
            <h1 className="text-sm font-extrabold text-slate-900 leading-tight">Rete Mali</h1>
            <p className="text-[10px] text-slate-500 leading-tight">Taman Baca &amp; Komunitas</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="p-2 text-slate-600 hover:text-blue-600 rounded-full hover:bg-slate-100 relative transition-colors"
            aria-label="Notifikasi"
          >
            <Bell size={18} />
            <span className="w-2 h-2 rounded-full bg-blue-600 absolute top-1.5 right-1.5" />
          </button>

          <button
            onClick={() => router.push(user ? '/portal' : '/login')}
            className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold flex items-center justify-center overflow-hidden"
            aria-label="Akun"
          >
            {user?.name ? user.name.slice(0, 2).toUpperCase() : <User size={15} />}
          </button>
        </div>
      </header>

      {/* Slide-over Navigation Drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex">
          <div className="w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col justify-between p-5 animate-in slide-in-from-left duration-200">
            <div className="space-y-5">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                    RM
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Rete Mali</h3>
                    <p className="text-[10px] text-slate-500">Ruang Literasi Warga</p>
                  </div>
                </div>

                <button
                  onClick={() => setMenuOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Main Nav Section */}
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Navigasi Utama
                </p>
                {[
                  { label: 'Beranda', href: '/', icon: BookOpen },
                  { label: 'Katalog Buku', href: '/katalog', icon: BookOpen },
                  { label: 'Kegiatan Komunitas', href: '/kegiatan', icon: Users },
                  { label: 'Donasi & Dukungan', href: '/donasi', icon: Heart },
                ].map((item) => (
                  <button
                    key={item.href}
                    onClick={() => {
                      router.push(item.href);
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    <item.icon size={16} className="text-blue-600" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Role Portals */}
              <div className="space-y-1 pt-2 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Portal Peran
                </p>
                {[
                  { label: 'Dashboard Member', href: '/dashboard/member' },
                  { label: 'Operasional Relawan', href: '/dashboard/volunteer' },
                  { label: 'Dashboard Admin', href: '/dashboard/admin' },
                ].map((item) => (
                  <button
                    key={item.href}
                    onClick={() => {
                      router.push(item.href);
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <span>{item.label}</span>
                    <ChevronRight size={14} className="text-slate-400" />
                  </button>
                ))}
              </div>
            </div>

            {/* Hours card at bottom of drawer */}
            <div className="bg-blue-50/80 border border-blue-100 rounded-2xl p-3 text-xs">
              <div className="flex items-center gap-2 text-blue-700 font-bold mb-1">
                <Clock size={15} />
                <span>Jam Buka Komunitas</span>
              </div>
              <p className="text-[11px] text-slate-600">Selasa – Minggu</p>
              <p className="text-xs font-bold text-slate-900">09:00 – 18:00 WIB</p>
            </div>
          </div>

          <div className="flex-1" onClick={() => setMenuOpen(false)} />
        </div>
      )}

      {/* Main Page Content */}
      <main className="px-4 pt-3 space-y-4">
        {/* Hero Section matching design */}
        <section className="bg-gradient-to-b from-blue-100/70 via-sky-50 to-white rounded-3xl p-5 border border-blue-100 shadow-xs relative overflow-hidden">
          {/* Header pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/90 backdrop-blur-xs rounded-full border border-blue-100 text-[11px] font-semibold text-slate-700 mb-3 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Buka Hari Ini • 09:00 – 18:00</span>
            <span className="text-slate-400 font-normal">| RT 05 RW 14 Jatirangga</span>
          </div>

          <h2 className="text-xl font-extrabold text-slate-900 leading-snug">
            Temukan Bacaan Favoritmu di{' '}
            <span className="text-blue-600">Rete Mali</span>
          </h2>

          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            Ruang literasi hangat warga Betawi Permai. Pinjam buku dengan mudah, ikut kelas kreatif,
            dan tebarkan semangat membaca untuk generasi muda.
          </p>

          {/* Action CTA buttons */}
          <div className="space-y-2 mt-4">
            <button
              onClick={() => router.push('/katalog')}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              <BookOpen size={16} />
              <span>Jelajahi Katalog</span>
            </button>

            <button
              onClick={() => router.push('/kegiatan')}
              className="w-full py-3 bg-sky-100/70 hover:bg-sky-100 text-blue-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
            >
              <Calendar size={16} />
              <span>Lihat Kegiatan</span>
            </button>
          </div>

          {/* 2 Stats row */}
          <div className="grid grid-cols-2 gap-2.5 mt-4 pt-3.5 border-t border-blue-100/70">
            <div className="bg-white/80 rounded-xl p-2.5 border border-blue-100 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <BookOpen size={17} />
              </div>
              <div>
                <p className="text-xs font-extrabold text-slate-900 leading-tight">
                  {bookCount.toLocaleString('id-ID')}+
                </p>
                <p className="text-[10px] text-slate-500 leading-tight">Koleksi Buku</p>
              </div>
            </div>

            <div className="bg-white/80 rounded-xl p-2.5 border border-blue-100 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Users size={17} />
              </div>
              <div>
                <p className="text-xs font-extrabold text-slate-900 leading-tight">
                  {memberCount.toLocaleString('id-ID')}+
                </p>
                <p className="text-[10px] text-slate-500 leading-tight">Keluarga Anggota</p>
              </div>
            </div>
          </div>
        </section>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari judul buku, penulis, atau topik..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200/90 rounded-2xl pl-10 pr-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
          />
        </form>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  if (cat !== 'Semua') {
                    router.push(`/katalog?category=${encodeURIComponent(cat)}`);
                  }
                }}
                className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Section: Koleksi Populer */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 leading-tight">Koleksi Populer</h3>
              <p className="text-[11px] text-slate-500 leading-tight">Paling sering dibaca minggu ini</p>
            </div>

            <button
              onClick={() => router.push('/katalog')}
              className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-0.5"
            >
              <span>Lihat Semua</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* 2-column book grid matching screenshot */}
          <div className="grid grid-cols-2 gap-3">
            {popularBooks.map((book) => {
              const isAvailable = book.status === 'AVAILABLE';
              return (
                <div
                  key={book.id}
                  className="bg-white rounded-2xl p-3 border border-slate-100 shadow-xs flex flex-col justify-between hover:shadow-sm transition-shadow"
                >
                  <div>
                    {/* Cover Box */}
                    <div className="relative w-full h-44 rounded-xl overflow-hidden bg-gradient-to-br from-blue-100 via-sky-50 to-indigo-100 flex flex-col items-center justify-center p-2 text-center mb-2">
                      <BookOpen size={32} className="text-blue-500 mb-1" />
                      <span className="text-[11px] font-extrabold text-slate-800 line-clamp-2 px-1">
                        {book.title}
                      </span>

                      {/* Status Tag */}
                      <span
                        className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isAvailable ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                        }`}
                      >
                        {isAvailable ? 'Tersedia' : 'Dipinjam'}
                      </span>

                      {/* Bookmark icon */}
                      <button className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/80 flex items-center justify-center text-slate-600">
                        <Bookmark size={13} />
                      </button>
                    </div>

                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                      {book.category}
                    </p>
                    <h4 className="text-xs font-bold text-slate-900 line-clamp-1 leading-snug">
                      {book.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mb-2.5">{book.author}</p>
                  </div>

                  <button
                    onClick={() => router.push('/katalog')}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-colors ${
                      isAvailable
                        ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {isAvailable ? 'Pinjam Buku' : 'Reservasi'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section: Kegiatan Komunitas */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
                Kegiatan Komunitas
              </h3>
              <p className="text-[11px] text-slate-500 leading-tight">
                Ajak adik dan tetangga berkumpul seru
              </p>
            </div>

            <button
              onClick={() => router.push('/kegiatan')}
              className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-0.5"
            >
              <span>Semua Acara</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Featured Event Card matching screenshot */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-xs border border-blue-100/80">
            <div className="relative h-44 bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 p-4 flex flex-col justify-end text-white">
              <div className="absolute top-3 left-3 flex items-center gap-1.5">
                <span className="bg-amber-400 text-amber-950 font-bold text-[10px] px-2.5 py-0.5 rounded-full">
                  Pekan Ini
                </span>
                <span className="bg-emerald-500 text-white font-bold text-[10px] px-2.5 py-0.5 rounded-full">
                  Gratis
                </span>
              </div>

              <p className="text-[11px] text-blue-200 mb-1">
                Sabtu, 14 Oktober • 10:00 - 12:00 WIB
              </p>
              <h4 className="text-base font-extrabold leading-snug drop-shadow-xs">
                Festival Dongeng Nusantara &amp; Panggung Boneka
              </h4>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Keseruan mendengarkan kisah petualangan Si Kancil dan dongeng nusantara dibawakan
                oleh Kak Dini bersama boneka tangan interaktif di Saung Baca Rete Mali.
              </p>

              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                <span className="text-slate-600 flex items-center gap-1">
                  <MapPin size={13} className="text-blue-600" /> Saung Rete Mali, Jatirangga
                </span>
                <span className="font-bold text-rose-600">• Sisa 6 Kursi</span>
              </div>

              <button
                onClick={() => router.push('/kegiatan')}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
              >
                Daftar Sekarang (Gratis)
              </button>
            </div>
          </div>
        </section>

        {/* Section: Gerakan Gotong Royong */}
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
              Gerakan Gotong Royong
            </h3>
            <p className="text-[11px] text-slate-500 leading-tight">
              Bantu taman baca warga terus berkembang
            </p>
          </div>

          <div className="space-y-2.5">
            {/* Card Donasi */}
            <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Heart size={20} className="fill-white" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Donasi Buku &amp; Dana Operasional
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                    Salurkan buku layak baca anak atau infak kas baca melalui QRIS terverifikasi.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => router.push('/donasi')}
                  className="py-2.5 bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 rounded-xl text-xs font-bold shadow-2xs transition-colors"
                >
                  📚 Kirim Buku
                </button>
                <button
                  onClick={() => router.push('/donasi')}
                  className="py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <QrCode size={14} />
                  <span>QRIS Donasi</span>
                </button>
              </div>
            </div>

            {/* Card Relawan */}
            <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Users size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Gabung Relawan</h4>
                  <p className="text-[11px] text-slate-500">Pengajar dongeng &amp; admin sirkulasi</p>
                </div>
              </div>

              <button
                onClick={() => router.push(user ? '/dashboard/member' : '/login')}
                className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl shrink-0 transition-colors"
              >
                Daftar
              </button>
            </div>
          </div>
        </section>

        {/* Section: Kunjungi Saung Baca */}
        <section className="bg-white rounded-2xl p-4 shadow-xs border border-blue-100/70 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-blue-700 font-bold text-xs">
              <MapPin size={16} />
              <span>Kunjungi Saung Baca</span>
            </div>
            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
              Akses Terbuka
            </span>
          </div>

          {/* Map Preview Box */}
          <div className="relative h-32 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex flex-col items-center justify-center text-center p-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center mb-1 shadow-sm">
              <MapPin size={16} />
            </div>
            <p className="text-xs font-bold text-slate-800">Perumahan Betawi Permai RT 05/14</p>
            <p className="text-[10px] text-slate-500">Kelurahan Jatirangga, Jatisampurna, Bekasi</p>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-[11px] text-slate-600">Patokan: Samping Pos Kamling RW 14</span>
            <a
              href="https://maps.google.com/?q=Jatirangga+Bekasi"
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 font-bold hover:underline flex items-center gap-1 text-[11px]"
            >
              <span>Buka Peta</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </section>

        {/* Footer matching design */}
        <footer className="pt-4 pb-6 text-center space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-blue-700 font-extrabold text-sm">
            <BookOpen size={16} />
            <span>Rete Mali</span>
          </div>

          <p className="text-[11px] text-slate-600 max-w-xs mx-auto leading-relaxed">
            Taman Bacaan Masyarakat &amp; Ruang Literasi Warga
            <br />
            Bersama RT 05 / RW 14 Kelurahan Jatirangga.
          </p>

          <div className="flex items-center justify-center gap-3 pt-1 text-slate-400">
            <button className="p-2 rounded-full hover:bg-slate-100 text-slate-600">
              <Camera size={16} />
            </button>
            <button className="p-2 rounded-full hover:bg-slate-100 text-slate-600">
              <MessageSquare size={16} />
            </button>
            <button className="p-2 rounded-full hover:bg-slate-100 text-slate-600">
              <Mail size={16} />
            </button>
          </div>

          <p className="text-[10px] text-slate-400 pt-1">
            © 2026 Taman Baca Rete Mali. Gotong royong untuk literasi.
          </p>
        </footer>
      </main>

      {/* Persistent Bottom Nav */}
      <BottomNav />
    </div>
  );
}
