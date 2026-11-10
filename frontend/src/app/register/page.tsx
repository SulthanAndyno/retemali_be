'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Loader2, CheckCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { post } from '@/lib/api';

interface RegisterResponse {
  data: {
    memberCode: string;
    name: string;
  };
  message: string;
  status: string;
}

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    rtRw: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successCode, setSuccessCode] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Password dan konfirmasi password tidak cocok.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password minimal 8 karakter.');
      return;
    }

    setLoading(true);
    try {
      const res = await post<RegisterResponse>('/auth/register', {
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        rtRw: form.rtRw,
      });
      setSuccessCode(res.data.memberCode);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Pendaftaran gagal. Coba lagi.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (successCode) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle size={36} className="text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Pendaftaran Berhasil! 🎉
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Akun Anda telah dibuat. Gunakan kode member berikut untuk referensi
            Anda.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <p className="text-xs text-gray-500 mb-1">Kode Member Anda</p>
            <p className="text-2xl font-bold text-blue-600 tracking-widest">
              {successCode}
            </p>
          </div>
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-6">
            Akun Anda memerlukan validasi admin sebelum dapat mengakses fitur
            peminjaman buku. Harap tunggu konfirmasi.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors"
          >
            Masuk ke Akun
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50 pb-10">
      <div className="max-w-md mx-auto px-4 pt-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white shadow-sm text-gray-600 hover:bg-gray-50"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <BookOpen size={16} className="text-white" />
            </div>
            <span className="font-bold text-gray-900">ReteMali</span>
          </div>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Daftar Anggota Baru</h1>
          <p className="text-sm text-gray-500 mt-1">
            Bergabunglah dengan komunitas membaca Rete Mali.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Data Diri
            </h3>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Nama sesuai KTP"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Nomor HP <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="08xxxxxxxxxx"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                RT/RW <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="rtRw"
                value={form.rtRw}
                onChange={handleChange}
                placeholder="Contoh: 05/14"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                required
              />
            </div>
          </div>

          {/* Account */}
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Akun
            </h3>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="email@contoh.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Min. 8 karakter"
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
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Konfirmasi Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Ulangi password"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-md disabled:opacity-60"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            Daftar Sekarang
          </button>

          <p className="text-center text-sm text-gray-500">
            Sudah punya akun?{' '}
            <a href="/login" className="text-blue-600 font-semibold hover:underline">
              Masuk di sini
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
