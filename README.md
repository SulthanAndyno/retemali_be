# Taman Baca Rete Mali - Backend REST API 📚✨

Backend REST API untuk **Taman Baca Rete Mali**, dibangun dengan **Express 5**, **TypeScript**, **PostgreSQL** via **Prisma 7**, **Zod Validation**, dan **JWT Authentication**.

Proyek ini dirancang menggunakan arsitektur modular (*Controller - Service - Repository*) yang terstruktur, aman, dan mudah diintegrasikan dengan Frontend.

---

## 🚀 Tech Stack

- **Runtime & Framework**: Node.js (v22+) & Express 5
- **Language**: TypeScript 6
- **Database & ORM**: PostgreSQL 14+ (standalone, Docker, atau managed seperti Supabase) & Prisma ORM 7 dengan driver adapter `@prisma/adapter-pg`
- **Authentication**: JWT (JSON Web Token) & bcrypt Password Hashing
- **Validation**: Zod Schemas
- **File Uploads**: Multer, disimpan di disk lokal (`uploads/`) dan disajikan oleh API pada `/uploads/*`
- **Code Generators**: Kode Buku `BK-XX-XXXX`, Member `#RM-YYYY-XXXX`, Invoice `INV-RM-YYYY-XXXX`, E-Ticket `RETEMALI-EV-XXXXXX`

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
Semua variabel di `.env` adalah konfigurasi **runtime** (dibaca saat proses start, bukan di-compile), sehingga artefak build yang sama bisa dipakai di environment mana pun:

```env
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/retemali_db?schema=public"
JWT_SECRET="ganti-dengan-openssl-rand-hex-32"
```

- `DATABASE_URL` — satu-satunya variabel yang perlu diubah untuk pindah database. Bisa menunjuk ke PostgreSQL lokal/Docker, VPS sendiri, atau managed (Supabase/Neon/RDS).
- `DATABASE_SSL` — opsional. Jika dikosongkan, TLS dideteksi otomatis: `sslmode=require` pada URL atau host managed (mis. `*.supabase.com`) menyalakan TLS, sedangkan `localhost` / nama service Docker memakai koneksi tanpa TLS.
- `DIRECT_URL` — opsional, hanya untuk provider managed yang memisahkan koneksi aplikasi dan koneksi migrasi (Supabase: `DATABASE_URL` = transaction pooler port 6543, `DIRECT_URL` = session pooler port 5432). Untuk PostgreSQL standalone, biarkan kosong: Prisma CLI otomatis memakai `DATABASE_URL`.
- `CLIENT_URL` — daftar origin yang diizinkan CORS, bisa dipisah koma (`https://retemali.id,https://www.retemali.id`). Pada `NODE_ENV=development`, `localhost:3000` selalu diizinkan.

Frontend punya template sendiri di `frontend/.env.example`:
```bash
cp frontend/.env.example frontend/.env.local
```
- `NEXT_PUBLIC_API_URL` — **build-time**, ikut ter-inline ke bundle browser dan sekaligus menjadi allow-list host gambar `next/image`. Mengubahnya butuh rebuild.
- `API_URL` — **runtime**, dipakai route handler Next.js di sisi server.

### 4. Migrasi Database & Seed Data
```bash
# Terapkan seluruh migrasi (baseline 0_init + migrasi berikutnya)
npx prisma migrate deploy

# Jalankan seeder akun default dan master data
npm run prisma:seed
```

> Database Supabase yang sudah ada sebelumnya dibuat dengan `prisma db push`, sehingga riwayat migrasinya kosong. Tandai baseline-nya sekali saja agar `migrate deploy` tidak mencoba membuat ulang tabel:
> ```bash
> npm run prisma:baseline
> ```
> Database baru (VPS/Docker) tidak perlu langkah ini — `migrate deploy` langsung membuat semua tabel.

### 5. Jalankan Server
```bash
# Development (auto-reload)
npm run dev

# Production (butuh build terlebih dahulu)
npm run build
npm start
```
Server akan aktif di `http://localhost:5000` (API endpoint di `http://localhost:5000/api`). `npm run build` menghasilkan `dist/` yang sudah bebas alias path (`@/...` di-rewrite oleh `tsc-alias`), sehingga `npm start` cukup menjalankan `node dist/server.js` — tanpa `tsx` dan tanpa devDependencies.

---

## 🐳 Deployment Self-Hosted (Docker / VPS)

Seluruh stack (PostgreSQL + API + web) sudah disiapkan di `docker-compose.prod.yml`.

**1. Siapkan environment**
```bash
cp .env.example .env.production
# wajib diisi: JWT_SECRET (openssl rand -hex 32), CLIENT_URL, NEXT_PUBLIC_API_URL
```

**2. Build & jalankan**
```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

**3. Terapkan migrasi + seed**
```bash
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
docker compose -f docker-compose.prod.yml exec api npx prisma db seed   # opsional
```

Catatan penting:

- Volume `uploads` menampung file unggahan (cover buku, QRIS, avatar, bukti pembayaran). Jangan dihapus — isinya tidak ada di database.
- `NEXT_PUBLIC_API_URL` di-inline saat **build**, jadi ubah nilainya lalu jalankan ulang `up -d --build`, bukan hanya `restart`.
- `API_URL` untuk container web memakai jaringan internal (`http://api:5000/api`), sementara `NEXT_PUBLIC_API_URL` tetap URL publik yang dipanggil browser.
- Migrasi dijalankan otomatis oleh service `api` sebelum server start, jadi `docker compose up` pada database kosong sudah cukup.
- Tanpa Docker: `npm ci && npm run build && npx prisma migrate deploy && npm start` di VPS, dengan `uploads/` pada path persisten dan proses dijalankan dari root repo.

---

## 🔑 Akun Demo Testing (Default Seed)

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@retemali.id` | `Password123` |
| **Relawan** | `relawan@retemali.id` | `Password123` |
| **Member** | `rifky@retemali.id` | `Password123` |

> Password default seeder (`Password123`) hanya untuk pengembangan. Ganti sebelum deploy produksi.

---

## 🧪 Testing

Jalankan pengujian otomatis E2E (End-to-End) untuk memastikan seluruh 48 endpoint berjalan 100% normal:
```bash
npm run test:e2e
```

