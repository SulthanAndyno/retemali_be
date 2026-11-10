'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Heart,
  QrCode,
  BookOpen,
  DollarSign,
  CheckCircle2,
  Share2,
  ShieldCheck,
  Send,
  Building,
  CreditCard,
  Package,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import { get, post } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils';

interface CampaignSummary {
  campaignTitle?: string;
  targetAmount: number;
  collectedAmount: number;
  percentage: number;
  donorCount: number;
}

export default function DonasiPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [activeDonationType, setActiveDonationType] = useState<'financial' | 'book'>('financial');
  const [summary, setSummary] = useState<CampaignSummary>({
    targetAmount: 30000000,
    collectedAmount: 24850000,
    percentage: 82,
    donorCount: 142,
  });

  // Financial Form
  const [amount, setAmount] = useState<number>(50000);
  const [donorName, setDonorName] = useState(user?.name || '');
  const [donorEmail, setDonorEmail] = useState(user?.email || '');
  const [purposeLabel, setPurposeLabel] = useState('Peralatan & Rak Ensiklopedia');
  const [paymentMethod, setPaymentMethod] = useState<'QRIS' | 'BANK_MANDIRI' | 'BANK_BCA'>('QRIS');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [financialLoading, setFinancialLoading] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);

  // Book Donation Form
  const [packageTitle, setPackageTitle] = useState('');
  const [totalBooks, setTotalBooks] = useState<number>(5);
  const [conditionNote, setConditionNote] = useState('Sangat baik / layak baca');
  const [deliveryMethod, setDeliveryMethod] = useState<'DROP_OFF' | 'COURIER'>('DROP_OFF');
  const [bookLoading, setBookLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await get<{ data: CampaignSummary }>('/donations/summary');
        if (res && res.data) {
          setSummary(res.data);
        }
      } catch {
        // Fallback
      }
    };
    fetchSummary();
  }, []);

  const handleFinancialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount < 5000) {
      showToast('Minimal donasi adalah Rp 5.000', 'error');
      return;
    }
    if (!isAnonymous && !donorName.trim()) {
      showToast('Masukkan nama donatur atau pilih opsi anonim', 'error');
      return;
    }

    try {
      setFinancialLoading(true);
      const res = await post<{ data: { receiptCode: string } }>('/donations/financial', {
        donorName: isAnonymous ? 'Hamba Allah' : donorName,
        donorEmail: donorEmail || undefined,
        isAnonymous,
        amount,
        purposeLabel,
        paymentMethod,
      });

      const code = res?.data?.receiptCode || `INV-RM-${Date.now().toString().slice(-6)}`;
      setReceipt(code);
      showToast('Donasi berhasil dicatat! Terima kasih atas kebaikan Anda.');
    } catch (err: unknown) {
      const error = err as Error;
      showToast(error.message || 'Gagal memproses donasi', 'error');
    } finally {
      setFinancialLoading(false);
    }
  };

  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageTitle.trim() || !totalBooks) {
      showToast('Lengkapi rincian paket buku fisik', 'error');
      return;
    }

    try {
      setBookLoading(true);
      await post('/donations/books', {
        donorName: donorName || 'Warga Rete Mali',
        packageTitle,
        totalBooks: Number(totalBooks),
        conditionNote,
        deliveryMethod,
      });
      showToast('Pendataan donasi buku fisik berhasil! Relawan kami akan memverifikasi di pos jaga.');
      setPackageTitle('');
    } catch (err: unknown) {
      const error = err as Error;
      showToast(error.message || 'Gagal mengirim donasi buku', 'error');
    } finally {
      setBookLoading(false);
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

      <Header title="Donasi & Dukungan" subtitle="Gerakan Gotong Royong Literasi" showBack />

      <main className="px-4 pt-3 space-y-4">
        {/* Campaign Progress Card */}
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100/70 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full uppercase">
              Kampanye Kuartal II 2026
            </span>
            <span className="text-xs font-extrabold text-blue-700">82% Target Rak</span>
          </div>

          <div>
            <h2 className="text-lg font-extrabold text-slate-900 leading-tight">
              Donasi Buku &amp; Dana Operasional
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Salurkan buku layak baca anak atau infak kas baca melalui QRIS terverifikasi.
            </p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-600 to-sky-500 rounded-full w-[82%]" />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
              <span>Terkumpul: <strong className="text-slate-800">{formatCurrency(summary.collectedAmount)}</strong></span>
              <span>Target: <strong>{formatCurrency(summary.targetAmount)}</strong></span>
            </div>
          </div>
        </section>

        {/* Donation Type Switcher */}
        <div className="grid grid-cols-2 bg-slate-200/80 p-1 rounded-2xl gap-1">
          <button
            onClick={() => setActiveDonationType('financial')}
            className={`py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeDonationType === 'financial'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <QrCode size={15} />
            <span>Donasi Finansial</span>
          </button>
          <button
            onClick={() => setActiveDonationType('book')}
            className={`py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeDonationType === 'book'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen size={15} />
            <span>Donasi Buku Fisik</span>
          </button>
        </div>

        {/* Tab 1: Donasi Finansial */}
        {activeDonationType === 'financial' && (
          <form onSubmit={handleFinancialSubmit} className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100/70 space-y-3.5 text-xs">
            {/* Amount Presets */}
            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Pilih Nominal Donasi</label>
              <div className="grid grid-cols-3 gap-2">
                {[10000, 25000, 50000, 100000, 250000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      amount === preset
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {formatCurrency(preset)}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Nominal */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Atau Masukkan Nominal Bebas</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2 font-mono font-bold text-slate-900"
                />
              </div>
            </div>

            {/* Purpose */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Peruntukan Dana</label>
              <select
                value={purposeLabel}
                onChange={(e) => setPurposeLabel(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium"
              >
                <option value="Peralatan & Rak Ensiklopedia">Peralatan &amp; Rak Ensiklopedia</option>
                <option value="Operasional Kelas Anak & Dongeng">Operasional Kelas Anak &amp; Dongeng</option>
                <option value="Pengadaan Buku Bacaan Baru">Pengadaan Buku Bacaan Baru</option>
                <option value="Infaq Kas Umum Saung Baca">Infaq Kas Umum Saung Baca</option>
              </select>
            </div>

            {/* Donor info */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-700">Identitas Donatur</label>
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-600">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>Anonim (Hamba Allah)</span>
                </label>
              </div>

              {!isAnonymous && (
                <>
                  <input
                    type="text"
                    placeholder="Nama Lengkap Donatur"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                  />
                  <input
                    type="email"
                    placeholder="Alamat Email (opsional untuk kuitansi)"
                    value={donorEmail}
                    onChange={(e) => setDonorEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                  />
                </>
              )}
            </div>

            {/* Payment Method */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <label className="font-semibold text-slate-700 block">Metode Pembayaran</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'QRIS', label: 'QRIS Statis', sub: 'Semua E-Wallet' },
                  { id: 'BANK_MANDIRI', label: 'Mandiri', sub: 'Transfer Bank' },
                  { id: 'BANK_BCA', label: 'BCA', sub: 'Transfer Bank' },
                ].map((pm) => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPaymentMethod(pm.id as any)}
                    className={`p-2 rounded-xl text-left border transition-all ${
                      paymentMethod === pm.id
                        ? 'bg-blue-50 border-blue-600 text-blue-900 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <p className="font-bold text-xs">{pm.label}</p>
                    <p className="text-[10px] text-slate-500">{pm.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* QRIS Visual Preview */}
            {paymentMethod === 'QRIS' && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center space-y-2">
                <div className="w-40 h-40 bg-white border border-slate-200 rounded-xl mx-auto flex flex-col items-center justify-center p-2 shadow-xs">
                  <QrCode size={100} className="text-slate-900" />
                  <span className="text-[9px] font-bold text-slate-500 tracking-wider uppercase mt-1">
                    NMID: ID1024389271649
                  </span>
                </div>
                <p className="text-[11px] font-bold text-slate-800">
                  Yayasan Taman Baca Rete Mali Jatirangga
                </p>
                <p className="text-[10px] text-slate-500">
                  Pindai menggunakan GoPay, OVO, Dana, ShopeePay, BCA Mobile, atau Livin Mandiri.
                </p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={financialLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Heart size={16} className="fill-white" />
              <span>{financialLoading ? 'Memproses...' : `Kirim Donasi ${formatCurrency(amount)}`}</span>
            </button>
          </form>
        )}

        {/* Tab 2: Donasi Buku Fisik */}
        {activeDonationType === 'book' && (
          <form onSubmit={handleBookSubmit} className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100/70 space-y-3.5 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Judul / Kategori Paket Buku</label>
              <input
                type="text"
                placeholder="Contoh: 15 Buku Ensiklopedia & Cerita Rakyat"
                value={packageTitle}
                onChange={(e) => setPackageTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Perkiraan Jumlah Buku</label>
                <input
                  type="number"
                  value={totalBooks}
                  onChange={(e) => setTotalBooks(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Metode Pengiriman</label>
                <select
                  value={deliveryMethod}
                  onChange={(e) => setDeliveryMethod(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                >
                  <option value="DROP_OFF">Drop-off di Saung</option>
                  <option value="COURIER">Kirim via Ekspedisi</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Catatan Kondisi Fisik</label>
              <textarea
                rows={2}
                value={conditionNote}
                onChange={(e) => setConditionNote(e.target.value)}
                placeholder="Catatan keutuhan halaman, cover, atau sasaran usia bacaan..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={bookLoading}
              className="w-full py-3 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Package size={16} />
              <span>{bookLoading ? 'Mendaftarkan...' : 'Kirim Pendataan Donasi Buku'}</span>
            </button>
          </form>
        )}

        {/* Receipt Code Banner */}
        {receipt && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-1.5 text-center">
            <CheckCircle2 size={24} className="text-emerald-600 mx-auto" />
            <h4 className="text-xs font-bold text-emerald-900">Kuitansi Digital Terbit</h4>
            <p className="font-mono text-sm font-extrabold text-emerald-700">{receipt}</p>
            <p className="text-[10px] text-emerald-600">
              Simpan kode ini sebagai bukti pencatatan audit donasi literasi warga.
            </p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
