'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  User,
  Heart,
  Shield,
  Eye,
  EyeOff,
  CheckCircle,
  ArrowRight,
  Loader2,
  X,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';

type Role = 'NON_MEMBER' | 'MEMBER' | 'VOLUNTEER' | 'ADMIN';

const features = [
  'Katalog buku dapat dicari dan disaring',
  'Kegiatan gratis maupun berbayar',
  'Donasi finansial & buku fisik',
  'Dashboard member, relawan, & admin',
];

const publicBenefits = [
  'Jelajahi seluruh katalog buku perpustakaan',
  'Lihat jadwal kegiatan komunitas',
  'Berikan donasi buku atau finansial',
  'Temukan info lokasi & jam buka',
];

const roles: {
  key: Role;
  icon: React.ReactNode;
  label: string;
  desc: string;
  badge?: string;
  badgeColor?: string;
}[] = [
  {
    key: 'NON_MEMBER',
    icon: <BookOpen size={22} />,
    label: 'Non-Member',
    desc: 'Tanpa akun — jelajahi katalog, kegiatan, dan donasi.',
  },
  {
    key: 'MEMBER',
    icon: <User size={22} />,
    label: 'Member',
    desc: 'Akses peminjaman, kegiatan, QR absensi, dan profil.',
  },
  {
    key: 'VOLUNTEER',
    icon: <Heart size={22} />,
    label: 'Volunteer',
    desc: 'Dashboard relawan: jadwal, tugas, dan absensi.',
    badge: 'Perlu persetujuan admin',
    badgeColor: 'bg-amber-100 text-amber-700',
  },
  {
    key: 'ADMIN',
    icon: <Shield size={22} />,
    label: 'Admin',
    desc: 'Kendali operasional pustaka & manajemen.',
    badge: 'Terbatas',
    badgeColor: 'bg-red-100 text-red-600',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRoleSelect = (role: Role) => {
    if (role === 'NON_MEMBER') {
      router.push('/');
      return;
    }
    const nextRole = selectedRole === role ? null : role;
    setSelectedRole(nextRole);
    setError('');

    if (nextRole === 'ADMIN') {
      setEmail('admin@retemali.id');
      setPassword('Password123');
    } else if (nextRole === 'VOLUNTEER') {
      setEmail('relawan@retemali.id');
      setPassword('Password123');
    } else if (nextRole === 'MEMBER') {
      setEmail('rifky@retemali.id');
      setPassword('Password123');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Email dan password wajib diisi.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      // Redirect based on role (AuthContext sets user, then redirect)
      router.push('/portal');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login gagal. Periksa email & password.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 pb-10">
      <Header title="Masuk Akun" showBack />
      <div className="max-w-md mx-auto px-4 pt-6">
        {/* Logo & Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <BookOpen size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Selamat Datang di ReteMali
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Temukan buku, ikuti kegiatan komunitas, dan tumbuh bersama Taman
            Baca ReteMali.
          </p>
        </div>

        {/* Features Pills */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {features.map(f => (
            <span
              key={f}
              className="inline-flex items-center gap-1.5 bg-white border border-blue-100 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-full shadow-sm"
            >
              <CheckCircle size={12} className="text-blue-500" />
              {f}
            </span>
          ))}
        </div>

        {/* Role Selection */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
            Pilih mode akses
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {roles.map(r => {
              const isSelected = selectedRole === r.key;
              const isNonMember = r.key === 'NON_MEMBER';
              return (
                <button
                  key={r.key}
                  onClick={() => handleRoleSelect(r.key)}
                  className={`text-left p-3 rounded-xl border-2 transition-all ${
                    isNonMember && selectedRole === null
                      ? 'border-blue-500 bg-blue-50'
                      : isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-100 bg-gray-50 hover:border-blue-200'
                  }`}
                >
                  <div
                    className={`mb-2 w-9 h-9 rounded-lg flex items-center justify-center ${
                      isSelected || (isNonMember && selectedRole === null)
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-500 border border-gray-200'
                    }`}
                  >
                    {r.icon}
                  </div>
                  {r.badge && (
                    <span
                      className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mb-1 ${r.badgeColor}`}
                    >
                      {r.badge}
                    </span>
                  )}
                  <p className="text-sm font-semibold text-gray-800">{r.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">{r.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Login Form (slide-in when role selected) */}
        {selectedRole && selectedRole !== 'NON_MEMBER' && (
          <div className="bg-white rounded-2xl shadow-sm p-5 mb-4 border border-blue-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-800">
                Masuk sebagai{' '}
                <span className="text-blue-600">
                  {roles.find(r => r.key === selectedRole)?.label}
                </span>
              </h3>
              <button
                onClick={() => setSelectedRole(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email@contoh.com"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : null}
                Masuk
              </button>
            </form>

            <p className="text-center text-xs text-gray-500 mt-4">
              Belum punya akun?{' '}
              <a
                href="/register"
                className="text-blue-600 font-semibold hover:underline"
              >
                Daftar di sini
              </a>
            </p>
          </div>
        )}

        {/* Public Access Benefits */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Sebagai pengunjung publik tanpa akun, Anda dapat:
          </h2>
          <div className="space-y-2">
            {publicBenefits.map(b => (
              <div
                key={b}
                className="flex items-center gap-2.5 border border-gray-100 rounded-xl px-3 py-2.5"
              >
                <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                <span className="text-sm text-gray-700">{b}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Open Public App Button */}
        <button
          onClick={() => router.push('/')}
          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-md mb-4"
        >
          Buka Aplikasi Publik
          <ArrowRight size={18} />
        </button>

        <p className="text-center text-xs text-gray-400 leading-relaxed">
          Fitur khusus member (pinjam buku, QR absensi) memerlukan akun
          tervalidasi.
        </p>
      </div>
    </div>
  );
}
