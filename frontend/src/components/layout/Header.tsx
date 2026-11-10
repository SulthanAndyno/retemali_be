'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Menu,
  ArrowLeft,
  Bell,
  User as UserIcon,
  LogIn,
  LogOut,
  X,
  BookOpen,
  Calendar,
  Heart,
  Clock,
  ChevronRight,
  Shield,
  HeartHandshake,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { getImageUrl } from '@/lib/utils';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
}

export default function Header({
  title,
  subtitle,
  showBack = false,
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [onProgressToast, setOnProgressToast] = useState(false);

  const handleMemberClick = () => {
    setOnProgressToast(true);
    setTimeout(() => setOnProgressToast(false), 3000);
  };

  return (
    <>
      {/* Toast Notification for On Progress */}
      {onProgressToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold bg-amber-600 text-white flex items-center gap-2 animate-in fade-in duration-200">
          <AlertCircle size={15} />
          <span>Dashboard Member sedang dalam tahap pengembangan (On Progress).</span>
        </div>
      )}

      {/* Main Top Header */}
      <header className="bg-white shadow-xs sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3 max-w-md mx-auto">
          {/* Left side: Hamburger Drawer + Optional Back */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setDrawerOpen(true)}
              className="p-1 -ml-1 text-slate-700 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Buka Menu Samping"
              title="Menu Navigasi"
            >
              <Menu size={22} />
            </button>

            {showBack && (
              <button
                onClick={() => router.back()}
                className="p-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Kembali"
              >
                <ArrowLeft size={20} />
              </button>
            )}

            <div>
              {title ? (
                <>
                  <h1 className="text-sm font-bold text-slate-900 leading-tight truncate max-w-[170px]">
                    {title}
                  </h1>
                  {subtitle && (
                    <p className="text-[10px] text-slate-500 leading-tight truncate max-w-[170px]">
                      {subtitle}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <h1 className="text-sm font-extrabold text-blue-700 leading-tight tracking-wide">
                    Rete Mali
                  </h1>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Taman Baca &amp; Komunitas
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Right side: Interaktif sesuai status login */}
          <div className="flex items-center gap-2">
            {user ? (
              // Jika SUDAH Login: Tampilkan Notifikasi & Avatar Profil
              <>
                <button
                  className="p-2 text-slate-600 hover:text-blue-600 rounded-full hover:bg-slate-100 relative transition-colors"
                  aria-label="Notifikasi"
                >
                  <Bell size={18} />
                  <span className="w-2 h-2 rounded-full bg-blue-600 absolute top-1.5 right-1.5" />
                </button>

                <button
                  onClick={() => router.push('/portal')}
                  className="w-8 h-8 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center border border-blue-200 text-blue-700 font-bold text-xs"
                  aria-label="Profil"
                >
                  {user.avatar ? (
                    <Image
                      src={getImageUrl(user.avatar)}
                      alt={user.name}
                      width={32}
                      height={32}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <span>{user.name ? user.name.slice(0, 2).toUpperCase() : 'RM'}</span>
                  )}
                </button>
              </>
            ) : (
              // Jika BELUM Login: HILANGKAN Icon Notifikasi & Profil, TAMPILKAN Tombol Interaktif "Masuk"
              <button
                onClick={() => router.push('/login')}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <span>Masuk</span>
                <LogIn size={13} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Universal Side Panel Drawer (Hadir di Setiap Halaman) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex">
          <div className="w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col justify-between p-5 animate-in slide-in-from-left duration-200">
            <div className="space-y-5 overflow-y-auto max-h-[calc(100vh-140px)] pr-1">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    RM
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Rete Mali</h3>
                    <p className="text-[10px] text-slate-500">Ruang Literasi Warga</p>
                  </div>
                </div>

                <button
                  onClick={() => setDrawerOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* NAVIGASI UTAMA (Untuk semua pengunjung) */}
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Navigasi Utama
                </p>
                {[
                  { label: 'Beranda', href: '/', icon: BookOpen },
                  { label: 'Katalog Buku', href: '/katalog', icon: BookOpen },
                  { label: 'Kegiatan Komunitas', href: '/kegiatan', icon: Calendar },
                  { label: 'Donasi & Dukungan', href: '/donasi', icon: Heart },
                ].map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <button
                      key={item.href}
                      onClick={() => {
                        router.push(item.href);
                        setDrawerOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-bold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <item.icon
                        size={16}
                        className={isActive ? 'text-blue-600' : 'text-slate-500'}
                      />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* PORTAL PERAN: DITIADAKAN bagi user yang belum login!
                  Bagi user login: Disesuaikan dengan role akunnya */}
              {user && (
                <div className="space-y-1 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Portal Peran
                    </p>
                    <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      {user.role}
                    </span>
                  </div>

                  {/* Menu khusus ADMIN */}
                  {user.role === 'ADMIN' && (
                    <>
                      <button
                        onClick={() => {
                          router.push('/dashboard/admin');
                          setDrawerOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <Shield size={16} className="text-indigo-600" />
                          <span>Dashboard Admin</span>
                        </div>
                        <ChevronRight size={14} className="text-slate-400" />
                      </button>

                      <button
                        onClick={() => {
                          router.push('/dashboard/volunteer');
                          setDrawerOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-teal-50 hover:text-teal-700 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <HeartHandshake size={16} className="text-teal-600" />
                          <span>Operasional Relawan</span>
                        </div>
                        <ChevronRight size={14} className="text-slate-400" />
                      </button>
                    </>
                  )}

                  {/* Menu khusus VOLUNTEER */}
                  {user.role === 'VOLUNTEER' && (
                    <button
                      onClick={() => {
                        router.push('/dashboard/volunteer');
                        setDrawerOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-teal-50 hover:text-teal-700 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <HeartHandshake size={16} className="text-teal-600" />
                        <span>Operasional Relawan</span>
                      </div>
                      <ChevronRight size={14} className="text-slate-400" />
                    </button>
                  )}

                  {/* Opsi Member: Ditandai "On Progress" sesuai arahan revisi */}
                  {(user.role === 'MEMBER' || user.role === 'DONOR') && (
                    <button
                      onClick={handleMemberClick}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-amber-50/80 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <UserCheck size={16} className="text-blue-600" />
                        <span>Dashboard Member</span>
                      </div>
                      <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        On Progress
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Drawer Card: Jam Buka & Logout/Login */}
            <div className="space-y-2 pt-3 border-t border-slate-100">
              <div className="bg-blue-50/80 border border-blue-100 rounded-2xl p-3 text-xs">
                <div className="flex items-center gap-2 text-blue-700 font-bold mb-1">
                  <Clock size={15} />
                  <span>Jam Buka Komunitas</span>
                </div>
                <p className="text-[11px] text-slate-600">Selasa – Minggu</p>
                <p className="text-xs font-bold text-slate-900">09:00 – 18:00 WIB</p>
              </div>

              {user ? (
                <button
                  onClick={() => {
                    logout();
                    setDrawerOpen(false);
                  }}
                  className="w-full py-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <LogOut size={14} />
                  <span>Keluar Akun</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    router.push('/login');
                    setDrawerOpen(false);
                  }}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <LogIn size={14} />
                  <span>Masuk Akun</span>
                </button>
              )}
            </div>
          </div>

          {/* Backdrop Click Outside */}
          <div className="flex-1" onClick={() => setDrawerOpen(false)} />
        </div>
      )}
    </>
  );
}
