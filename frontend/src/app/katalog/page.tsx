'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  BookOpen,
  CheckCircle2,
  Bookmark,
  Star,
  QrCode,
  RotateCw,
  X,
  Share2,
  Heart,
  ChevronRight,
  Info,
  Clock,
  MapPin,
  LogIn,
  Plus,
  Edit2,
  Trash2,
  Upload
} from 'lucide-react';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import { get, post, patch, del } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { getImageUrl } from '@/lib/utils';

interface BookItem {
  id: string;
  bookCode: string;
  isbn?: string;
  title: string;
  slug: string;
  author: string;
  publisher?: string;
  publishYear?: number;
  category: string;
  synopsis?: string;
  coverImage?: string;
  shelfLocation: string;
  totalStock: number;
  availableStock: number;
  rating: number | string;
  borrowCount: number;
  status: 'AVAILABLE' | 'BORROWED' | 'MAINTENANCE';
  isBookmarked?: boolean;
}

interface BooksResponse {
  data: BookItem[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const filterTabs = [
  { id: 'ALL', label: 'Semua (24)' },
  { id: 'AVAILABLE', label: 'Tersedia (19)' },
  { id: 'BORROWED', label: 'Sedang Dipinjam (5)' },
  { id: 'FIKSI_SASTRA', label: 'Fiksi & Sastra' },
  { id: 'SAINS_FAKTA', label: 'Sains & Fakta' },
  { id: 'EDUKASI_ANAK', label: 'Edukasi Anak' },
  { id: 'PSIKOLOGI', label: 'Psikologi' },
];

export default function KatalogPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [books, setBooks] = useState<BookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'rating'>('newest');
  const [page, setPage] = useState(1);
  const [totalBooks, setTotalBooks] = useState(2480);
  const [totalPages, setTotalPages] = useState(414);
  const [selectedBook, setSelectedBook] = useState<BookItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Book CRUD for Relawan (CRU) & Admin (CRUD)
  const canManageBook = user?.role === 'ADMIN' || user?.role === 'VOLUNTEER';
  const canDeleteBook = user?.role === 'ADMIN';

  const [showBookModal, setShowBookModal] = useState(false);
  const [editingBook, setEditingBook] = useState<BookItem | null>(null);
  const [bookSubmitting, setBookSubmitting] = useState(false);
  const [bookDeletingId, setBookDeletingId] = useState<string | null>(null);
  const [bookCoverFile, setBookCoverFile] = useState<File | null>(null);
  const [bookCoverPreview, setBookCoverPreview] = useState<string | null>(null);

  const [bookFormData, setBookFormData] = useState({
    title: '',
    author: '',
    category: 'FIKSI_SASTRA',
    shelfLocation: 'Rak B-04',
    totalStock: 3,
    publisher: '',
    isbn: '',
    synopsis: '',
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const openCreateBookModal = () => {
    setEditingBook(null);
    setBookCoverFile(null);
    setBookCoverPreview(null);
    setBookFormData({
      title: '',
      author: '',
      category: 'FIKSI_SASTRA',
      shelfLocation: 'Rak B-04',
      totalStock: 3,
      publisher: '',
      isbn: '',
      synopsis: '',
    });
    setShowBookModal(true);
  };

  const openEditBookModal = (book: BookItem) => {
    setEditingBook(book);
    setBookCoverFile(null);
    setBookCoverPreview(book.coverImage ? getImageUrl(book.coverImage) : null);
    setBookFormData({
      title: book.title || '',
      author: book.author || '',
      category: book.category || 'FIKSI_SASTRA',
      shelfLocation: book.shelfLocation || 'Rak B-04',
      totalStock: book.totalStock || 1,
      publisher: book.publisher || '',
      isbn: book.isbn || '',
      synopsis: book.synopsis || '',
    });
    setShowBookModal(true);
  };

  const handleBookFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bookFormData.title.trim().length < 3) {
      showToast('Judul buku minimal 3 karakter', 'error');
      return;
    }
    if (bookFormData.author.trim().length < 2) {
      showToast('Nama penulis minimal 2 karakter', 'error');
      return;
    }
    if (!bookFormData.shelfLocation.trim()) {
      showToast('Lokasi rak wajib diisi', 'error');
      return;
    }

    try {
      setBookSubmitting(true);
      const formData = new FormData();
      formData.append('title', bookFormData.title.trim());
      formData.append('author', bookFormData.author.trim());
      formData.append('category', bookFormData.category);
      formData.append('shelfLocation', bookFormData.shelfLocation.trim());
      formData.append('totalStock', String(bookFormData.totalStock));
      if (bookFormData.publisher.trim()) formData.append('publisher', bookFormData.publisher.trim());
      if (bookFormData.isbn.trim()) formData.append('isbn', bookFormData.isbn.trim());
      if (bookFormData.synopsis.trim()) formData.append('synopsis', bookFormData.synopsis.trim());
      if (bookCoverFile) formData.append('coverImage', bookCoverFile);

      const token = typeof window !== 'undefined' ? localStorage.getItem('retemali_token') : null;
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const url = `${API_URL}/books${editingBook ? `/${editingBook.id}` : ''}`;
      const res = await fetch(url, {
        method: editingBook ? 'PATCH' : 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Gagal menyimpan buku');
      }

      showToast(editingBook ? 'Data buku berhasil diperbarui!' : 'Buku baru berhasil ditambahkan ke katalog!');
      setShowBookModal(false);
      setSelectedBook(null);
      fetchBooks();
    } catch (err: unknown) {
      const error = err as Error;
      showToast(error.message || 'Gagal menyimpan buku', 'error');
    } finally {
      setBookSubmitting(false);
    }
  };

  const handleDeleteBook = async (book: BookItem) => {
    if (!confirm(`Hapus buku "${book.title}" (${book.bookCode}) secara permanen dari sistem?`)) {
      return;
    }
    try {
      setBookDeletingId(book.id);
      await del(`/books/${book.id}`);
      showToast(`Buku "${book.title}" berhasil dihapus`);
      setSelectedBook(null);
      fetchBooks();
    } catch (err: unknown) {
      const error = err as Error;
      showToast(error.message || 'Gagal menghapus buku', 'error');
    } finally {
      setBookDeletingId(null);
    }
  };

  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true);

      // Jika tab "Sedang Dipinjam" dan user login, prioritaskan menampilkan buku aktif yang dipinjam user
      if (activeTab === 'BORROWED' && user) {
        try {
          const loanRes = await get<{
            data: Array<{
              id: string;
              loanCode: string;
              dueDate: string;
              status: string;
              book: BookItem;
            }>;
          }>('/circulation/loans/me?status=BORROWED');

          if (loanRes && loanRes.data && loanRes.data.length > 0) {
            const userBorrowedBooks: BookItem[] = loanRes.data
              .filter((l) => l.book && l.status === 'BORROWED')
              .map((l) => ({
                ...l.book,
                status: 'BORROWED',
                availableStock: 0,
                synopsis: `Buku ini sedang Anda pinjam (Kode Pinjam: ${l.loanCode}, Jatuh Tempo: ${new Date(l.dueDate).toLocaleDateString('id-ID')}).`,
              }));

            setBooks(userBorrowedBooks);
            setTotalBooks(userBorrowedBooks.length);
            setTotalPages(1);
            return;
          }
        } catch {
          // Lanjutkan ke query buku umum jika terjadi kendala pada riwayat user
        }
      }

      let queryParam = `?page=${page}&limit=10`;
      if (searchQuery.trim()) {
        queryParam += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }
      if (activeTab === 'AVAILABLE') {
        queryParam += `&status=AVAILABLE`;
      } else if (activeTab === 'BORROWED') {
        queryParam += `&status=BORROWED`;
      } else if (activeTab !== 'ALL') {
        queryParam += `&category=${activeTab}`;
      }

      if (sortBy === 'popular') queryParam += `&sort=borrowCount&order=desc`;
      else if (sortBy === 'rating') queryParam += `&sort=rating&order=desc`;
      else queryParam += `&sort=createdAt&order=desc`;

      const res = await get<BooksResponse>(`/books${queryParam}`);
      if (res && res.data) {
        setBooks(res.data);
        const meta = res.meta || res.pagination;
        if (meta) {
          setTotalBooks(meta.total || 2480);
          setTotalPages(meta.totalPages || 414);
        }
      }
    } catch {
      // Fallback sample catalog if backend offline
      setBooks([
        {
          id: '1',
          bookCode: 'BK-FA-0042',
          title: 'Filosofi Teras',
          slug: 'filosofi-teras',
          author: 'Henry Manampiring',
          category: 'PSIKOLOGI',
          shelfLocation: 'Rak B-04',
          totalStock: 4,
          availableStock: 3,
          rating: 4.9,
          borrowCount: 142,
          status: 'AVAILABLE',
          synopsis: 'Buku filsafat Stoa kuno yang dikontekstualisasikan untuk kehidupan mental warga perkotaan modern yang tenang dan tangguh.',
        },
        {
          id: '2',
          bookCode: 'BK-SA-0081',
          title: 'Cantik Itu Luka',
          slug: 'cantik-itu-luka',
          author: 'Eka Kurniawan',
          category: 'FIKSI_SASTRA',
          shelfLocation: 'Rak A-02',
          totalStock: 2,
          availableStock: 0,
          rating: 4.8,
          borrowCount: 98,
          status: 'BORROWED',
          synopsis: 'Kisah magis dan kelam Dewi Ayu di kota Halimunda yang merangkum masa kolonial hingga pergolakan sejarah Nusantara.',
        },
        {
          id: '3',
          bookCode: 'BK-SN-0019',
          title: 'Kosmos: Carl Sagan',
          slug: 'kosmos-carl-sagan',
          author: 'Carl Sagan',
          category: 'SAINS_FAKTA',
          shelfLocation: 'Rak D-01',
          totalStock: 2,
          availableStock: 2,
          rating: 5.0,
          borrowCount: 75,
          status: 'AVAILABLE',
          synopsis: 'Eksplorasi puitis tentang 15 miliar tahun evolusi kosmik, ilmu pengetahuan, peradaban, dan tempat manusia di alam semesta.',
        },
        {
          id: '4',
          bookCode: 'BK-SA-0099',
          title: 'Orang-Orang Bloomington',
          slug: 'orang-orang-bloomington',
          author: 'Budi Darma',
          category: 'FIKSI_SASTRA',
          shelfLocation: 'Rak A-05',
          totalStock: 1,
          availableStock: 1,
          rating: 4.7,
          borrowCount: 64,
          status: 'AVAILABLE',
          synopsis: 'Kumpulan cerita pendek legendaris mengenai keterasingan batin, kecurigaan, dan dinamika manusia di kota kecil Amerika.',
        },
        {
          id: '5',
          bookCode: 'BK-AN-0102',
          title: 'Petualangan Si Kancil Rimba',
          slug: 'petualangan-si-kancil',
          author: 'Tariq Mahardika',
          category: 'EDUKASI_ANAK',
          shelfLocation: 'Rak E-02',
          totalStock: 5,
          availableStock: 4,
          rating: 4.9,
          borrowCount: 110,
          status: 'AVAILABLE',
          synopsis: 'Cerita bergambar edukatif tentang kecerdikan Kancil menolong satwa rimba dengan pesan moral persaudaraan dan kejujuran.',
        },
        {
          id: '6',
          bookCode: 'BK-PS-0033',
          title: 'Atomic Habits',
          slug: 'atomic-habits',
          author: 'James Clear',
          category: 'PSIKOLOGI',
          shelfLocation: 'Rak B-01',
          totalStock: 3,
          availableStock: 2,
          rating: 4.9,
          borrowCount: 230,
          status: 'AVAILABLE',
          synopsis: 'Perubahan kecil yang memberikan hasil luar biasa, panduan praktis membentuk kebiasaan baik dan meruntuhkan kebiasaan buruk.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, activeTab, sortBy, user]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const handleToggleBookmark = async (book: BookItem) => {
    if (!user) {
      router.push('/login');
      return;
    }
    try {
      await post(`/books/${book.id}/bookmark`);
      setBooks((prev) =>
        prev.map((b) => (b.id === book.id ? { ...b, isBookmarked: !b.isBookmarked } : b))
      );
      showToast(book.isBookmarked ? 'Buku dihapus dari simpanan bacaan' : 'Buku disimpan ke daftar bacaan!');
    } catch {
      showToast('Gagal mengubah bookmark', 'error');
    }
  };

  const handleAjukanPinjam = async (book: BookItem) => {
    if (!user) {
      router.push('/login');
      return;
    }
    try {
      setActionLoading(true);
      await post('/circulation/reservations', { bookId: book.id });
      showToast(`Reservasi buku "${book.title}" berhasil dibuat! Berlaku 48 jam di Loket Sirkulasi.`);
      setSelectedBook(null);
      fetchBooks();
    } catch (err: unknown) {
      const error = err as Error;
      showToast(error.message || 'Gagal mengajukan pinjaman', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-blue-50/50 pb-24 text-slate-800">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium transition-all ${
            notification.type === 'success'
              ? 'bg-blue-600 text-white'
              : 'bg-rose-600 text-white'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Main Header */}
      <Header />

      <main className="px-4 pt-3 space-y-4">
        {/* Banner Section: KOLEKSI WARGA */}
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-blue-600 mb-1">
              <BookOpen size={16} className="text-blue-600" />
              <span className="text-xs font-bold tracking-wider uppercase">Koleksi Warga</span>
            </div>
            {canManageBook && (
              <button
                onClick={openCreateBookModal}
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs transition-colors"
              >
                <Plus size={14} />
                <span>Tambah Buku</span>
              </button>
            )}
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 leading-snug">
            Katalog Buku Perpustakaan
          </h1>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Jelajahi 2.480 koleksi buku bacaan & ensiklopedia RT05 RW14 Jatirangga.
          </p>

          {/* Stat Chips */}
          <div className="grid grid-cols-2 gap-2.5 mt-3.5">
            <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-2.5 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 leading-tight">1.892 Buku</p>
                <p className="text-[11px] text-slate-500 leading-tight">Siap Dipinjam</p>
              </div>
            </div>

            <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-2.5 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                <BookOpen size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 leading-tight">588 Buku</p>
                <p className="text-[11px] text-slate-500 leading-tight">Sedang Dibaca</p>
              </div>
            </div>
          </div>
        </section>

        {/* Search, Filter, Sort Row */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari judul, penulis, rak..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full bg-white border border-slate-200/80 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>

          <button
            onClick={() => {
              setActiveTab('ALL');
              setSearchQuery('');
            }}
            className="p-2.5 bg-white border border-slate-200/80 rounded-xl text-slate-600 hover:bg-slate-50 shadow-sm"
            title="Filter opsi"
          >
            <SlidersHorizontal size={17} />
          </button>

          <button
            onClick={() => {
              setSortBy((prev) => (prev === 'newest' ? 'popular' : prev === 'popular' ? 'rating' : 'newest'));
            }}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-white border border-slate-200/80 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <ArrowUpDown size={15} className="text-blue-600" />
            <span>
              {sortBy === 'newest' ? 'Terbaru' : sortBy === 'popular' ? 'Terpopuler' : 'Rating'}
            </span>
          </button>
        </div>

        {/* Category Filter Pills (Scrollable) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {filterTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm font-semibold'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Book Grid (2 columns matching design) */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3 py-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm animate-pulse space-y-2">
                <div className="w-full h-44 bg-slate-200 rounded-xl" />
                <div className="h-3 bg-slate-200 rounded w-2/3" />
                <div className="h-4 bg-slate-200 rounded w-full" />
                <div className="h-8 bg-slate-200 rounded-xl w-full" />
              </div>
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm">
            <BookOpen size={40} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">Tidak ada buku ditemukan</p>
            <p className="text-xs text-slate-500 mt-1">Coba kata kunci lain atau reset filter kategori.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {books.map((book) => {
              const isAvailable = book.status === 'AVAILABLE' && book.availableStock > 0;
              return (
                <div
                  key={book.id}
                  className="bg-white rounded-2xl p-3 border border-slate-100/90 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative group"
                >
                  <div>
                    {/* Cover Image & Badges */}
                    <div className="relative w-full h-44 rounded-xl overflow-hidden bg-slate-100 mb-2.5">
                      {book.coverImage ? (
                        <Image
                          src={getImageUrl(book.coverImage)}
                          alt={book.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-100 via-sky-50 to-indigo-100 flex flex-col items-center justify-center p-2 text-center">
                          <BookOpen size={30} className="text-blue-500 mb-1" />
                          <span className="text-[11px] font-bold text-slate-700 line-clamp-2 px-1">
                            {book.title}
                          </span>
                        </div>
                      )}

                      {/* Status Tag */}
                      <div className="absolute top-2 left-2 z-10">
                        {isAvailable ? (
                          <span className="bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                            Tersedia
                          </span>
                        ) : (
                          <span className="bg-amber-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                            Dipinjam
                          </span>
                        )}
                      </div>

                      {/* Bookmark Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleBookmark(book);
                        }}
                        className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-slate-600 hover:text-rose-500 transition-colors shadow-sm"
                      >
                        <Heart
                          size={15}
                          className={book.isBookmarked ? 'fill-rose-500 text-rose-500' : ''}
                        />
                      </button>

                      {/* Rating pill */}
                      <div className="absolute bottom-2 right-2 z-10 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 backdrop-blur-xs">
                        <Star size={11} className="fill-amber-400 text-amber-400" />
                        <span>{book.rating ? Number(book.rating).toFixed(1) : '5.0'}</span>
                      </div>
                    </div>

                    {/* Shelf & Stock Info */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                      <span className="font-medium text-slate-600">{book.shelfLocation || 'Rak B-04'}</span>
                      <span className={`font-semibold ${isAvailable ? 'text-blue-600' : 'text-amber-600'}`}>
                        {book.availableStock}/{book.totalStock} Stok
                      </span>
                    </div>

                    {/* Book Title & Author */}
                    <h3 className="text-xs font-bold text-slate-900 line-clamp-2 leading-tight mb-0.5">
                      {book.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mb-2.5">
                      {book.author}
                    </p>
                  </div>

                  {/* Action Button */}
                  <div className="space-y-1.5">
                    {isAvailable ? (
                      <button
                        onClick={() => setSelectedBook(book)}
                        className="w-full py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 active:bg-blue-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                      >
                        Lihat Detail <ChevronRight size={14} />
                      </button>
                    ) : (
                      <button
                        onClick={() => setSelectedBook(book)}
                        className="w-full py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                      >
                        Reservasi
                      </button>
                    )}

                    {/* Quick Management for Relawan (CRU) & Admin (CRUD) */}
                    {canManageBook && (
                      <div className="flex items-center gap-1 pt-1 border-t border-slate-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditBookModal(book);
                          }}
                          className="flex-1 py-1 px-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1"
                        >
                          <Edit2 size={11} className="text-blue-600" />
                          <span>Edit</span>
                        </button>
                        {canDeleteBook && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteBook(book);
                            }}
                            disabled={bookDeletingId === book.id}
                            className="py-1 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 disabled:opacity-50"
                          >
                            <Trash2 size={11} className="text-rose-600" />
                            <span>{bookDeletingId === book.id ? '...' : 'Hapus'}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Floating Quick Scan Bar */}
        <section className="bg-white border border-blue-100 rounded-2xl p-3.5 shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <QrCode size={22} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 leading-tight">Sedang di Taman Baca?</p>
              <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                Pindai barcode buku untuk meminjam cepat.
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard/volunteer')}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shrink-0 shadow-sm transition-colors"
          >
            Pindai
          </button>
        </section>

        {/* Load More Button */}
        <div className="pt-2 text-center space-y-2">
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages || loading}
            className="w-full py-2.5 bg-white border border-blue-200 text-blue-700 font-semibold text-xs rounded-xl hover:bg-blue-50 flex items-center justify-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
          >
            <RotateCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Muat Lebih Banyak Koleksi</span>
          </button>

          <p className="text-[11px] text-slate-500">
            Menampilkan {books.length} dari {totalBooks} Buku • Halaman {page} dari {totalPages}
          </p>
        </div>
      </main>

      {/* Redesigned Full-Height Pop-Up Book Detail & Borrow Panel */}
      {selectedBook && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end sm:items-center sm:justify-center p-0 transition-opacity">
          {/* Backdrop click to close */}
          <div className="flex-1 w-full" onClick={() => setSelectedBook(null)} />

          {/* Modal Container: Pops up all the way to top (95dvh) with sticky header and sticky footer */}
          <div className="w-full max-w-md h-[95dvh] sm:h-[88vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300 relative z-10">
            {/* Top Bar with Handle & Actions */}
            <div className="px-5 pt-3 pb-2.5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <button
                onClick={() => setSelectedBook(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
                aria-label="Tutup"
              >
                <X size={18} />
              </button>

              <div className="text-center">
                <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-1.5" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Detail &amp; Peminjaman
                </h3>
              </div>

              <button
                onClick={() => handleToggleBookmark(selectedBook)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-blue-600 flex items-center justify-center transition-colors"
                aria-label="Simpan Buku"
                title="Simpan Bacaan"
              >
                <Bookmark
                  size={16}
                  className={selectedBook.isBookmarked ? 'fill-blue-600 text-blue-600' : ''}
                />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Book Header Card */}
              <div className="flex gap-4 items-start bg-gradient-to-br from-blue-50/70 via-sky-50/40 to-white p-3.5 rounded-2xl border border-blue-100/70">
                {/* Book Cover Illustration */}
                <div className="relative w-20 h-28 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex flex-col items-center justify-center text-white shrink-0 shadow-md p-1.5 text-center overflow-hidden">
                  <div className="absolute inset-0 bg-white/10 backdrop-blur-2xs" />
                  <BookOpen size={24} className="relative z-10 mb-1" />
                  <span className="relative z-10 text-[9px] font-bold line-clamp-2 px-1">
                    {selectedBook.title}
                  </span>
                </div>

                {/* Meta details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                        selectedBook.status === 'AVAILABLE' && selectedBook.availableStock > 0
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          selectedBook.status === 'AVAILABLE' && selectedBook.availableStock > 0
                            ? 'bg-emerald-500'
                            : 'bg-amber-500'
                        }`}
                      />
                      {selectedBook.status === 'AVAILABLE' && selectedBook.availableStock > 0
                        ? 'Tersedia'
                        : 'Sedang Dipinjam'}
                    </span>

                    <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      {selectedBook.category}
                    </span>
                  </div>

                  <h2 className="text-base font-extrabold text-slate-900 leading-snug line-clamp-2">
                    {selectedBook.title}
                  </h2>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    Penulis: {selectedBook.author}
                  </p>
                  <p className="text-[11px] font-mono text-slate-400 mt-1">
                    ID: {selectedBook.bookCode || 'BK-RM-001'}
                  </p>

                  <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-600">
                    <span className="font-bold text-amber-600 flex items-center gap-0.5">
                      ★ {selectedBook.rating || 4.9}
                    </span>
                    <span>•</span>
                    <span>{selectedBook.borrowCount || 45}x Dipinjam</span>
                  </div>
                </div>
              </div>

              {/* Physical Location & Availability Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mb-1">
                    <MapPin size={13} className="text-blue-600" />
                    <span>Lokasi Rak Fisik</span>
                  </div>
                  <p className="font-extrabold text-sm text-slate-900">
                    {selectedBook.shelfLocation || 'Rak Utama B-04'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Saung Rete Mali</p>
                </div>

                <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-3 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-blue-600 text-[11px] mb-1">
                    <BookOpen size={13} />
                    <span>Stok Tersedia</span>
                  </div>
                  <p className="font-extrabold text-sm text-blue-700">
                    {selectedBook.availableStock} Unit
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    dari {selectedBook.totalStock} Total Stok
                  </p>
                </div>
              </div>

              {/* Synopsis Box */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <h4 className="text-xs font-bold text-slate-900 mb-1.5">Sinopsis &amp; Ringkasan</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {selectedBook.synopsis ||
                    'Buku bermutu ini menjadi salah satu bacaan yang paling diminati oleh adik-adik dan warga di Saung Baca Rete Mali. Tersedia untuk dibaca di tempat maupun dipinjam ke rumah selama masa aktif keanggotaan.'}
                </p>
              </div>

              {/* Ketentuan Peminjaman */}
              <div className="bg-blue-50/50 border border-blue-100/60 rounded-2xl p-3.5 space-y-2 text-xs">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Info size={14} className="text-blue-600" />
                  <span>Ketentuan Peminjaman Rete Mali</span>
                </h4>
                <ul className="space-y-1 text-[11px] text-slate-600 pl-4 list-disc">
                  <li>Durasi peminjaman standar: <strong>7 hari kalender</strong>.</li>
                  <li>Dapat diperpanjang 1 kali (+7 hari) melalui dashboard.</li>
                  <li>Ambil buku di Loket Sirkulasi dengan menunjukkan QR/Kode anggota.</li>
                  <li>Reservasi berlaku 48 jam sebelum dialihkan ke antrean berikutnya.</li>
                </ul>
              </div>

              {/* Non-login Notice */}
              {!user && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-2.5">
                  <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900">
                    <p className="font-bold">Perhatian untuk Tamu</p>
                    <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                      Anda belum masuk ke akun. Silakan tekan tombol di bawah untuk masuk agar formulir reservasi buku dapat langsung diproses ke loket sirkulasi.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Bottom Action Bar (Selalu Terlihat di Layar Paling Bawah) */}
            <div className="p-4 bg-white border-t border-slate-100 shadow-xl shrink-0 space-y-2">
              {user ? (
                selectedBook.status === 'AVAILABLE' && selectedBook.availableStock > 0 ? (
                  <button
                    onClick={() => handleAjukanPinjam(selectedBook)}
                    disabled={actionLoading}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    <BookOpen size={16} />
                    <span>{actionLoading ? 'Sedang Memproses...' : 'Ajukan Pinjam Sekarang'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleAjukanPinjam(selectedBook)}
                    disabled={actionLoading}
                    className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    <Clock size={16} />
                    <span>
                      {actionLoading ? 'Memproses Reservasi...' : 'Masuk Antrean Reservasi'}
                    </span>
                  </button>
                )
              ) : (
                <button
                  onClick={() => router.push('/login')}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all"
                >
                  <LogIn size={16} />
                  <span>Masuk Akun untuk Meminjam</span>
                </button>
              )}

              {/* Operasional Buku (Relawan: Edit | Admin: Edit & Hapus) */}
              {canManageBook && (
                <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditBookModal(selectedBook)}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Edit2 size={13} className="text-blue-600" />
                    <span>Edit Data Buku</span>
                  </button>
                  {canDeleteBook && (
                    <button
                      type="button"
                      onClick={() => handleDeleteBook(selectedBook)}
                      disabled={bookDeletingId === selectedBook.id}
                      className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={13} className="text-rose-600" />
                      <span>{bookDeletingId === selectedBook.id ? 'Menghapus...' : 'Hapus (Admin)'}</span>
                    </button>
                  )}
                </div>
              )}

              <p className="text-[10px] text-center text-slate-400">
                Peminjaman 100% gratis untuk seluruh warga &amp; komunitas Rete Mali.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal CRUD Buku (Relawan: CRU | Admin: CRUD) */}
      {showBookModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {editingBook ? 'Edit Data Koleksi Buku' : 'Tambah Buku Baru'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {user?.role === 'ADMIN'
                    ? 'Akses Penuh Administrator (CRUD)'
                    : 'Akses Operasional Relawan (CRU)'}
                </p>
              </div>
              <button
                onClick={() => setShowBookModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleBookFormSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Judul Buku *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Filosofi Teras"
                  value={bookFormData.title}
                  onChange={(e) => setBookFormData({ ...bookFormData, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Penulis *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Henry Manampiring"
                    value={bookFormData.author}
                    onChange={(e) => setBookFormData({ ...bookFormData, author: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kategori Buku *</label>
                  <select
                    value={bookFormData.category}
                    onChange={(e) => setBookFormData({ ...bookFormData, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="FIKSI_SASTRA">Fiksi &amp; Sastra</option>
                    <option value="SAINS_FAKTA">Sains &amp; Fakta</option>
                    <option value="SEJARAH">Sejarah</option>
                    <option value="PSIKOLOGI">Psikologi</option>
                    <option value="EDUKASI_ANAK">Edukasi Anak</option>
                    <option value="ENSIKLOPEDIA">Ensiklopedia</option>
                    <option value="KOMIK_EDUKASI">Komik Edukasi</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Lokasi Rak Fisik *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Rak B-04"
                    value={bookFormData.shelfLocation}
                    onChange={(e) => setBookFormData({ ...bookFormData, shelfLocation: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Total Stok *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={bookFormData.totalStock}
                    onChange={(e) => setBookFormData({ ...bookFormData, totalStock: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Penerbit</label>
                  <input
                    type="text"
                    placeholder="Contoh: Gramedia"
                    value={bookFormData.publisher}
                    onChange={(e) => setBookFormData({ ...bookFormData, publisher: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">ISBN</label>
                  <input
                    type="text"
                    placeholder="Contoh: 978602..."
                    value={bookFormData.isbn}
                    onChange={(e) => setBookFormData({ ...bookFormData, isbn: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Sinopsis / Ringkasan</label>
                <textarea
                  rows={3}
                  placeholder="Ceritakan ringkasan isi buku, keunggulan bacaan, atau kelompok pembaca yang cocok..."
                  value={bookFormData.synopsis}
                  onChange={(e) => setBookFormData({ ...bookFormData, synopsis: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Upload Sampul Buku */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Upload Gambar Sampul Buku
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl font-bold cursor-pointer transition-colors shadow-2xs">
                    <Upload size={14} className="text-blue-600" />
                    <span>Pilih Sampul</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setBookCoverFile(file);
                          setBookCoverPreview(URL.createObjectURL(file));
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  {bookCoverPreview ? (
                    <div className="flex items-center gap-2">
                      <div className="relative w-10 h-14 rounded-md overflow-hidden border border-slate-200 shadow-2xs">
                        <img src={bookCoverPreview} alt="Preview Sampul" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-[11px] text-emerald-600 font-bold">Sampul siap</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400">Belum ada gambar sampul</span>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBookModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={bookSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-50"
                >
                  {bookSubmitting ? 'Menyimpan...' : editingBook ? 'Simpan Perubahan' : 'Tambah ke Katalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Persistent Bottom Nav */}
      <BottomNav />
    </div>
  );
}
