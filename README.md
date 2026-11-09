# Taman Baca Rete Mali - Backend REST API 📚✨

Backend REST API untuk **Taman Baca Rete Mali**, dibangun dengan **Express 5**, **TypeScript**, **PostgreSQL** via **Prisma 7**, **Zod Validation**, dan **JWT Authentication**.

Proyek ini dirancang menggunakan arsitektur modular (*Controller - Service - Repository*) yang terstruktur, aman, dan mudah diintegrasikan dengan Frontend.

---

## 🚀 Tech Stack

- **Runtime & Framework**: Node.js (v20+) & Express 5
- **Language**: TypeScript 5.8
- **Database & ORM**: PostgreSQL 16+ & Prisma ORM 7
- **Authentication**: JWT (JSON Web Token) & Argon2 Password Hashing
- **Validation**: Zod Schemas
- **File Uploads**: Multer (Cover Buku, Avatar, E-Ticket, Bukti Donasi)
- **Code Generators**: Nanoid (Kode Buku `BK-XX-XXXX`, Member `#RM-YYYY-XXXX`, Invoice `INV-RM-YYYY-XXXX`, E-Ticket `RETEMALI-EV-XXXXXX`)

---

## 📂 Struktur Modul Bisnis

Backend ini mencakup 10 modul bisnis utama dengan total **48 Endpoints**:

1. **Authentication & Profile (`/api/auth`)**: Registrasi kartu anggota `#RM-YYYY-XXXX`, Login, Profile `/me`, Update profil, Change password.
2. **Katalog Buku & Pencarian (`/api/books`)**: CRUD buku, status ketersediaan, nomor barcode/rak, filter kategori & pencarian judul/penulis.
3. **Daftar Bacaan / Bookmark (`/api/bookmarks`)**: Toggle simpan buku favorit bagi pengunjung.
4. **Sirkulasi Peminjaman (`/api/circulation`)**: Reservasi 48 jam, checkout cepat scan barcode, perpanjangan +7 hari, pengembalian, status hilang, reminder WhatsApp, cron job H-2.
5. **Agenda & Event Komunitas (`/api/events`)**: Agenda literasi, registrasi peserta, penerbitan E-Ticket QR Code, validasi check-in kehadiran, laporan kegiatan.
6. **Program Relawan (`/api/volunteers`)**: Pendaftaran relawan, kurasi aplikasi, shift presensi clock-in/out, rekap jam kontribusi.
7. **Catatan Operasional / Handover (`/api/handover-notes`)**: Buku catatan operasional antar shift relawan dengan penanda darurat & perlengkapan.
8. **Donasi Keuangan & Buku (`/api/donations`)**: Donasi QRIS Statis yayasan (NMID: `ID1024389271649`), penerbitan invoice digital, donasi buku fisik & kurasi relawan, webhook payment gateway.
9. **Dashboard Real-time (`/api/dashboard`)**: Agregasi data statistik untuk Publik, Pengunjung, Desk Relawan, dan Admin Utama.
10. **Audit Log System (`/api/audit-logs`)**: Rekam jejak seluruh aktivitas penting sistem secara real-time.

---

## 🛠️ Panduan Instalasi & Menjalankan Lokal

### 1. Clone Repository
```bash
git clone https://github.com/SulthanAndyno/retemali_be.git
cd retemali_be
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Konfigurasi Environment (`.env`)
Salin file `.env.example` ke `.env`:
```bash
cp .env.example .env
```
Sesuaikan konfigurasi koneksi database PostgreSQL dan secret key:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/retemali_db?schema=public"
JWT_SECRET="retemali_super_secret_jwt_key_2026_literasi_tanpa_batas"
JWT_EXPIRES_IN="7d"
CORS_ORIGIN="*"
```

### 4. Sinkronisasi Database & Seed Data
```bash
# Push schema Prisma ke database PostgreSQL
npx prisma db push

# Jalankan seeder akun default dan master data
npm run prisma:seed
```

### 5. Jalankan Server Development
```bash
npm run dev
```
Server akan aktif di `http://localhost:5000` (API endpoint di `http://localhost:5000/api`).

---

## 🔑 Akun Demo Testing (Default Seed)

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@retemali.id` | `AdminPass123!` |
| **Relawan** | `relawan@retemali.id` | `RelawanPass123!` |
| **Member** | `member@retemali.id` | `MemberPass123!` |

---

## 🧪 Testing

Jalankan pengujian otomatis E2E (End-to-End) untuk memastikan seluruh 48 endpoint berjalan 100% normal:
```bash
npm run test:e2e
```

---

## 📑 Dokumentasi API & Integrasi Frontend

Dokumentasi lengkap dan file testing tersimpan di folder `docs/`:
- **Spesifikasi Endpoint**: [docs/RETEMALI_BACKEND_ENDPOINT.pdf](docs/RETEMALI_BACKEND_ENDPOINT.pdf)
- **Product Requirement Document (PRD)**: [docs/PRD_RETEMALI_BACKEND.pdf](docs/PRD_RETEMALI_BACKEND.pdf)
- **Postman Collection**: [docs/Retemali_Backend_Postman_Collection.json](docs/Retemali_Backend_Postman_Collection.json)
- **Postman Environment**: [docs/Retemali_Postman_Environment.json](docs/Retemali_Postman_Environment.json)
