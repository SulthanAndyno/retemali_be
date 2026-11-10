'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Shield,
  HeartHandshake,
  BookOpen,
  Calendar,
  LogOut,
  LogIn,
  UserPlus,
  ChevronRight,
  Settings,
  Sparkles,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import { useAuth } from '@/contexts/AuthContext';

export default function PortalPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [onProgressToast, setOnProgressToast] = useState(false);

  const handleMemberClick = () => {
    setOnProgressToast(true);
    setTimeout(() => setOnProgressToast(false), 3000);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-blue-50/50 pb-24 text-slate-800">
      {/* Toast Notification for On Progress */}
      {onProgressToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold bg-amber-600 text-white flex items-center gap-2 animate-in fade-in duration-200">
          <AlertCircle size={15} />
          <span>Dashboard Member sedang dalam tahap pengembangan (On Progress).</span>
        </div>
      )}

      <Header title="Portal Peran" subtitle="Pusat Navigasi & Akun" />

      <main className="px-4 pt-3 space-y-4">
        {user ? (
          <>
            {/* Logged in Profile Card */}
            <section className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100/70 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-extrabold text-base flex items-center justify-center shadow-xs">
                  {user.name ? user.name.slice(0, 2).toUpperCase() : 'RM'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-extrabold text-slate-900 truncate">
                      {user.name}
                    </h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      {user.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{user.memberCode}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                </div>
              </div>
            </section>

            {/* Role Dashboards Nav: Disesuaikan Khusus dengan Role User */}
            <section className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100/70 space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Akses Dashboard ({user.role})
              </h3>

              {/* Admin Console (Khusus ADMIN) */}
              {user.role === 'ADMIN' && (
                <>
                  <button
                    onClick={() => router.push('/dashboard/admin')}
                    className="w-full p-3 rounded-xl bg-indigo-50/60 hover:bg-indigo-100/80 text-left flex items-center justify-between transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-indigo-700 text-white flex items-center justify-center">
                        <Shield size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Dashboard Administrator</h4>
                        <p className="text-[11px] text-slate-500">
                          Pusat kendali 4 KPI, kurasi relawan, sirkulasi, &amp; audit
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <button
                    onClick={() => router.push('/dashboard/volunteer')}
                    className="w-full p-3 rounded-xl bg-teal-50/60 hover:bg-teal-100/80 text-left flex items-center justify-between transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-teal-700 text-white flex items-center justify-center">
                        <HeartHandshake size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Meja Operasional Relawan</h4>
                        <p className="text-[11px] text-slate-500">
                          Shift presensi, sirkulasi barcode cepat, &amp; donasi
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </>
              )}

              {/* Volunteer Operational (Khusus VOLUNTEER) */}
              {user.role === 'VOLUNTEER' && (
                <button
                  onClick={() => router.push('/dashboard/volunteer')}
                  className="w-full p-3 rounded-xl bg-teal-50/60 hover:bg-teal-100/80 text-left flex items-center justify-between transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-teal-700 text-white flex items-center justify-center">
                      <HeartHandshake size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Meja Operasional Relawan</h4>
                      <p className="text-[11px] text-slate-500">
                        Shift presensi, sirkulasi barcode cepat, &amp; donasi
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}

              {/* Member: Ditandai "On Progress" sesuai arahan revisi */}
              {(user.role === 'MEMBER' || user.role === 'DONOR') && (
                <button
                  onClick={handleMemberClick}
                  className="w-full p-3 rounded-xl bg-amber-50/60 hover:bg-amber-100/80 text-left flex items-center justify-between transition-colors group border border-amber-200/60"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                      <User size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900">
                          Dashboard Member
                        </h4>
                        <span className="text-[9px] font-bold bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                          On Progress
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Desain antarmuka dashboard sedang dalam tahap pengembangan
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}
            </section>

            {/* Logout Button */}
            <button
              onClick={logout}
              className="w-full py-3 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <LogOut size={16} />
              <span>Keluar dari Akun</span>
            </button>
          </>
        ) : (
          <>
            {/* Non-logged in card */}
            <section className="bg-white rounded-2xl p-5 shadow-sm border border-blue-100/70 text-center space-y-3">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl mx-auto flex items-center justify-center">
                <User size={28} />
              </div>

              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  Selamat Datang di Rete Mali
                </h2>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Silakan masuk atau daftar anggota untuk meminjam buku fisik, klaim E-Tiket kegiatan, dan fitur relawan.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => router.push('/login')}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <LogIn size={16} />
                  <span>Masuk / Pilih Mode Akses</span>
                </button>

                <button
                  onClick={() => router.push('/register')}
                  className="w-full py-3 bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <UserPlus size={16} />
                  <span>Daftar Anggota Baru</span>
                </button>
              </div>
            </section>

            {/* Public Quick Access */}
            <section className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100/70 space-y-2 text-xs">
              <h3 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-2">
                Eksplorasi Publik Tanpa Akun
              </h3>

              <button
                onClick={() => router.push('/katalog')}
                className="w-full p-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen size={16} className="text-blue-600" />
                  <span className="font-semibold text-slate-700">Katalog Buku Warga</span>
                </div>
                <ChevronRight size={14} className="text-slate-400" />
              </button>

              <button
                onClick={() => router.push('/kegiatan')}
                className="w-full p-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Calendar size={16} className="text-blue-600" />
                  <span className="font-semibold text-slate-700">Agenda &amp; Kelas Komunitas</span>
                </div>
                <ChevronRight size={14} className="text-slate-400" />
              </button>

              <button
                onClick={() => router.push('/donasi')}
                className="w-full p-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles size={16} className="text-blue-600" />
                  <span className="font-semibold text-slate-700">Donasi Finansial &amp; Buku</span>
                </div>
                <ChevronRight size={14} className="text-slate-400" />
              </button>
            </section>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
