import "dotenv/config";
import app from "../src/app";
import http from "http";

const PORT = 2000;
let server: http.Server;
const BASE_URL = `http://localhost:${PORT}`;

interface TestResult {
  name: string;
  status: "PASS" | "FAIL";
  httpStatus: number;
  expectedStatus: number;
  details?: string;
}

const results: TestResult[] = [];

async function request(
  method: string,
  endpoint: string,
  body?: any,
  token?: string,
): Promise<{ status: number; data: any }> {
  const headers: Record<string, string> = {};
  if (body) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  return { status: res.status, data };
}

function record(
  name: string,
  actual: number,
  expected: number,
  data?: any,
) {
  const isPass = actual === expected;
  results.push({
    name,
    status: isPass ? "PASS" : "FAIL",
    httpStatus: actual,
    expectedStatus: expected,
    details: isPass
      ? undefined
      : `Response: ${JSON.stringify(data)?.slice(0, 150)}`,
  });

  const icon = isPass ? "✅" : "❌";
  console.log(`${icon} [${actual}] ${name}`);
  if (!isPass) {
    console.error(`   Error details:`, data);
  }
}

async function runTests() {
  console.log("==========================================================");
  console.log("🚀 STARTING RETEMALI BACKEND E2E TEST SUITE (POSTMAN-STYLE)");
  console.log("==========================================================\n");

  // 1. Health
  console.log("--- 0. SYSTEM HEALTH ---");
  const health = await request("GET", "/health");
  record("GET /health", health.status, 200, health.data);

  // 2. Auth
  console.log("\n--- 1. AUTH & PROFILE MODULE ---");
  const regEmail = `testuser.${Date.now()}@retemali.id`;
  const register = await request("POST", "/api/auth/register", {
    name: "Pengujian Anggota Baru",
    email: regEmail,
    password: "Password123",
    phone: "081234567890",
    rtRw: "RT05/RW14",
  });
  record("POST /api/auth/register (Member Baru)", register.status, 201, register.data);
  const newMemberCode = register.data?.data?.user?.memberCode;

  const loginAdmin = await request("POST", "/api/auth/login", {
    email: "admin@retemali.id",
    password: "Password123",
  });
  record("POST /api/auth/login (Admin)", loginAdmin.status, 200, loginAdmin.data);
  const adminToken = loginAdmin.data?.data?.token;

  const loginVol = await request("POST", "/api/auth/login", {
    email: "relawan@retemali.id",
    password: "Password123",
  });
  record("POST /api/auth/login (Volunteer)", loginVol.status, 200, loginVol.data);
  const volunteerToken = loginVol.data?.data?.token;

  const loginMem = await request("POST", "/api/auth/login", {
    email: "rifky@retemali.id",
    password: "Password123",
  });
  record("POST /api/auth/login (Member Rifky)", loginMem.status, 200, loginMem.data);
  const memberToken = loginMem.data?.data?.token;

  const profile = await request("GET", "/api/auth/me", undefined, memberToken);
  record("GET /api/auth/me (Profil & Poin)", profile.status, 200, profile.data);

  const updateProfile = await request(
    "PATCH",
    "/api/auth/me",
    { readingTarget: 25 },
    memberToken,
  );
  record("PATCH /api/auth/me (Update Target Baca)", updateProfile.status, 200, updateProfile.data);

  // 3. Dashboard
  console.log("\n--- 2. DASHBOARD AGGREGATIONS ---");
  const dashPublic = await request("GET", "/api/dashboard/public");
  record("GET /api/dashboard/public (Statistik Beranda)", dashPublic.status, 200, dashPublic.data);

  const dashMem = await request("GET", "/api/dashboard/member", undefined, memberToken);
  record("GET /api/dashboard/member (Portal Anggota)", dashMem.status, 200, dashMem.data);

  const dashVol = await request("GET", "/api/dashboard/volunteer", undefined, volunteerToken);
  record("GET /api/dashboard/volunteer (Meja Operasional)", dashVol.status, 200, dashVol.data);

  const dashAdmin = await request("GET", "/api/dashboard/admin", undefined, adminToken);
  record("GET /api/dashboard/admin (Konsol Administrator)", dashAdmin.status, 200, dashAdmin.data);

  // 4. Books
  console.log("\n--- 3. BOOKS & CATALOG MODULE ---");
  const books = await request("GET", "/api/books?page=1&limit=5&category=PSIKOLOGI");
  record("GET /api/books (Katalog & Filter)", books.status, 200, books.data);

  const searchBooks = await request("GET", "/api/books?search=Filosofi");
  record("GET /api/books?search=Filosofi (Pencarian)", searchBooks.status, 200, searchBooks.data);

  const detailBook = await request("GET", "/api/books/filosofi-teras");
  record("GET /api/books/:slug (Detail Buku)", detailBook.status, 200, detailBook.data);
  const targetBookId = detailBook.data?.data?.id;

  const createBook = await request(
    "POST",
    "/api/books",
    {
      title: `Buku Uji Sains E2E ${Date.now()}`,
      author: "Pakar Sains Komunitas",
      category: "SAINS_FAKTA",
      shelfLocation: "Rak D-05",
      totalStock: 3,
      synopsis: "Buku uji coba otomatis.",
    },
    adminToken,
  );
  record("POST /api/books (Tambah Buku Baru)", createBook.status, 201, createBook.data);
  const createdBookId = createBook.data?.data?.id;

  const updateBook = await request(
    "PATCH",
    `/api/books/${createdBookId}`,
    { shelfLocation: "Rak D-06" },
    adminToken,
  );
  record("PATCH /api/books/:id (Update Buku)", updateBook.status, 200, updateBook.data);

  // 5. Bookmarks
  console.log("\n--- 4. BOOKMARK / SIMPAN BACAAN MODULE ---");
  const addBookmark = await request(
    "POST",
    "/api/bookmarks",
    { bookId: targetBookId },
    memberToken,
  );
  record("POST /api/bookmarks (Simpan Bacaan)", addBookmark.status === 200 || addBookmark.status === 201 ? addBookmark.status : 0, addBookmark.status, addBookmark.data);

  const getBookmarks = await request("GET", "/api/bookmarks", undefined, memberToken);
  record("GET /api/bookmarks (Daftar Simpanan Bacaan)", getBookmarks.status, 200, getBookmarks.data);

  const delBookmark = await request(
    "DELETE",
    `/api/bookmarks/${targetBookId}`,
    undefined,
    memberToken,
  );
  record("DELETE /api/bookmarks/:bookId (Hapus Simpanan)", delBookmark.status, 200, delBookmark.data);

  // 6. Circulation
  console.log("\n--- 5. CIRCULATION MODULE ---");
  const reserve = await request(
    "POST",
    "/api/circulation/reservations",
    { bookId: targetBookId, pickupCounter: "Loket Sirkulasi A-2" },
    memberToken,
  );
  record("POST /api/circulation/reservations (Reservasi 48 Jam)", reserve.status, 201, reserve.data);
  const resCode = reserve.data?.data?.reservationCode;

  const myRes = await request(
    "GET",
    "/api/circulation/reservations/me",
    undefined,
    memberToken,
  );
  record("GET /api/circulation/reservations/me", myRes.status, 200, myRes.data);

  const checkout = await request(
    "POST",
    "/api/circulation/quick-checkout",
    {
      memberIdentifier: "RM-2024-089",
      bookIdentifier: "BK-PS-0899",
      reservationCode: resCode,
      durationDays: 14,
    },
    volunteerToken,
  );
  record("POST /api/circulation/quick-checkout (Sirkulasi Cepat)", checkout.status, 201, checkout.data);
  const loanId = checkout.data?.data?.id;

  const loans = await request(
    "GET",
    "/api/circulation/loans?page=1&limit=5",
    undefined,
    volunteerToken,
  );
  record("GET /api/circulation/loans (List Transaksi Pinjam)", loans.status, 200, loans.data);

  const myLoans = await request(
    "GET",
    "/api/circulation/loans/me",
    undefined,
    memberToken,
  );
  record("GET /api/circulation/loans/me (Pinjaman Aktif Saya)", myLoans.status, 200, myLoans.data);

  if (loanId) {
    const remindWa = await request(
      "POST",
      `/api/circulation/loans/${loanId}/remind-wa`,
      undefined,
      volunteerToken,
    );
    record("POST /api/circulation/loans/:id/remind-wa (Link WhatsApp)", remindWa.status, 200, remindWa.data);
  }

  const cronDue = await request("POST", "/api/circulation/cron/due-reminders");
  record("POST /api/circulation/cron/due-reminders (Cron Pengingat H-2)", cronDue.status, 200, cronDue.data);

  const quickReturn = await request(
    "POST",
    "/api/circulation/quick-return",
    {
      bookIdentifier: "BK-PS-0899",
      memberIdentifier: "RM-2024-089",
      returnCondition: "GOOD",
      notes: "Kondisi buku baik dan rapi",
    },
    volunteerToken,
  );
  record("POST /api/circulation/quick-return (Pengembalian & Poin)", quickReturn.status, 200, quickReturn.data);

  // 7. Community Events
  console.log("\n--- 6. COMMUNITY EVENTS MODULE ---");
  const events = await request("GET", "/api/events?page=1&limit=5");
  record("GET /api/events (Daftar Agenda Kegiatan)", events.status, 200, events.data);

  const createEvent = await request(
    "POST",
    "/api/events",
    {
      title: `Workshop Koding Warga ${Date.now()}`,
      category: "SAINS",
      description: "Pelatihan logika komputasi untuk warga remaja.",
      facilitatorName: "Kak Dimas",
      location: "Pendopo Rete Mali",
      eventDate: "2026-05-20T00:00:00.000Z",
      startTime: "10:00",
      endTime: "12:00",
      quota: 20,
      feeType: "FREE",
    },
    adminToken,
  );
  record("POST /api/events (Tambah Agenda Baru)", createEvent.status, 201, createEvent.data);
  const createdEventId = createEvent.data?.data?.id;

  const regEvent = await request(
    "POST",
    "/api/events/festival-dongeng-nusantara-panggung-boneka/register",
    undefined,
    memberToken,
  );
  record("POST /api/events/:id/register (Daftar E-Tiket QR)", regEvent.status, 201, regEvent.data);
  const ticketCode = regEvent.data?.data?.ticketCode;

  const myTickets = await request("GET", "/api/events/tickets/me", undefined, memberToken);
  record("GET /api/events/tickets/me (Daftar Tiket Saya)", myTickets.status, 200, myTickets.data);

  if (ticketCode) {
    const checkIn = await request(
      "POST",
      "/api/events/check-in",
      { ticketCode },
      volunteerToken,
    );
    record("POST /api/events/check-in (Presensi QR Gerbang)", checkIn.status, 200, checkIn.data);
  }

  // 8. Volunteers & Shifts
  console.log("\n--- 7. VOLUNTEER & SHIFT MODULE ---");
  const applyVol = await request(
    "POST",
    "/api/volunteers/apply",
    {
      majorOrJob: "Sastra Indonesia",
      institution: "Universitas Indonesia",
      division: "Kelas Cerita",
      motivation: "Ingin mendongeng dan membimbing adik-adik membaca.",
    },
    register.data?.data?.token,
  );
  record("POST /api/volunteers/apply (Daftar Calon Relawan)", applyVol.status, 201, applyVol.data);
  const appId = applyVol.data?.data?.id;

  const listApps = await request("GET", "/api/volunteers/applications", undefined, adminToken);
  record("GET /api/volunteers/applications (List Berkas)", listApps.status, 200, listApps.data);

  if (appId) {
    const reviewApp = await request(
      "PATCH",
      `/api/volunteers/applications/${appId}/review`,
      { status: "APPROVED" },
      adminToken,
    );
    record("PATCH /api/volunteers/applications/:id/review (Approval Relawan)", reviewApp.status, 200, reviewApp.data);
  }

  const clockIn = await request(
    "POST",
    "/api/volunteers/shifts/clock-in",
    {
      shiftType: "SHIFT_PAGI",
      taskSummary: "Penyortiran Buku Anak & Registrasi Pengunjung",
    },
    volunteerToken,
  );
  record("POST /api/volunteers/shifts/clock-in (Mulai Piket)", clockIn.status, 201, clockIn.data);

  const clockOut = await request(
    "PATCH",
    "/api/volunteers/shifts/clock-out",
    {
      taskSummary: "Tugas selesai dengan melayani 20 pengunjung.",
      durationHours: 4.0,
    },
    volunteerToken,
  );
  record("PATCH /api/volunteers/shifts/clock-out (Selesai Piket)", clockOut.status, 200, clockOut.data);

  const approveShifts = await request(
    "PATCH",
    "/api/volunteers/shifts/approve-all",
    undefined,
    adminToken,
  );
  record("PATCH /api/volunteers/shifts/approve-all (Setujui Jam Piket)", approveShifts.status, 200, approveShifts.data);

  // 9. Handover Notes
  console.log("\n--- 8. SHIFT HANDOVER NOTE MODULE ---");
  const createNote = await request(
    "POST",
    "/api/handover-notes",
    {
      shiftType: "SHIFT_PAGI",
      tags: ["Stok Sanitizer Tipis", "Rak Ensiklopedia Rapi"],
      content: "Catatan pergantian shift: kondisi pos jaga aman dan bersih.",
    },
    volunteerToken,
  );
  record("POST /api/handover-notes (Catatan Logistik Piket)", createNote.status, 201, createNote.data);
  const noteId = createNote.data?.data?.id;

  const getNotes = await request("GET", "/api/handover-notes", undefined, volunteerToken);
  record("GET /api/handover-notes (Daftar Catatan Piket)", getNotes.status, 200, getNotes.data);

  if (noteId) {
    const delNote = await request(
      "DELETE",
      `/api/handover-notes/${noteId}`,
      undefined,
      volunteerToken,
    );
    record("DELETE /api/handover-notes/:id (Hapus Catatan)", delNote.status, 200, delNote.data);
  }

  // 10. Donations
  console.log("\n--- 9. DONATION & LOGISTICS MODULE ---");
  const donSummary = await request("GET", "/api/donations/summary");
  record("GET /api/donations/summary (Capaian & Live Feed)", donSummary.status, 200, donSummary.data);

  const createFin = await request("POST", "/api/donations/financial", {
    donorName: "Dian Kusuma",
    amount: 500000,
    paymentMethod: "QRIS",
    purposeLabel: "Donasi Operasional & Snack",
  });
  record("POST /api/donations/financial (Donasi QRIS Instan)", createFin.status, 201, createFin.data);
  const receiptCode = createFin.data?.data?.receiptCode;

  if (receiptCode) {
    const getReceipt = await request("GET", `/api/donations/financial/${receiptCode}`);
    record("GET /api/donations/financial/:code (Kuitansi Digital)", getReceipt.status, 200, getReceipt.data);
  }

  const createBookDon = await request("POST", "/api/donations/books", {
    donorName: "Budi Santoso",
    donorBadge: "Warga RW 14",
    packageTitle: "25 Buku Sains Populer",
    totalBooks: 25,
    conditionNote: "Kondisi sangat mulus 90%",
    deliveryMethod: "DROP_OFF",
  });
  record("POST /api/donations/books (Submit Donasi Buku)", createBookDon.status, 201, createBookDon.data);
  const batchId = createBookDon.data?.data?.id;

  const listBookDons = await request("GET", "/api/donations/books", undefined, volunteerToken);
  record("GET /api/donations/books (Antrean Kurasi Relawan)", listBookDons.status, 200, listBookDons.data);

  if (batchId) {
    const verifyBookDon = await request(
      "PATCH",
      `/api/donations/books/${batchId}/verify`,
      { status: "ACCEPTED", curationNote: "Diterima dan masuk rak koleksi." },
      volunteerToken,
    );
    record("PATCH /api/donations/books/:id/verify (Verifikasi Donasi Masuk)", verifyBookDon.status, 200, verifyBookDon.data);
  }

  // 11. Audit Logs
  console.log("\n--- 10. AUDIT LOGS MODULE ---");
  const auditLogs = await request("GET", "/api/audit-logs", undefined, adminToken);
  record("GET /api/audit-logs (Live Feed Audit Admin)", auditLogs.status, 200, auditLogs.data);

  // Cleanup test items
  if (createdBookId) {
    await request("DELETE", `/api/books/${createdBookId}`, undefined, adminToken);
  }
  if (createdEventId) {
    await request("DELETE", `/api/events/${createdEventId}`, undefined, adminToken);
  }

  // Summary
  console.log("\n==========================================================");
  console.log("📊 HASIL AKHIR PENGUJIAN ENDPOINT (POSTMAN TEST SUITE)");
  console.log("==========================================================");
  const total = results.length;
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;

  console.log(`Total Endpoint Diuji: ${total}`);
  console.log(`✅ Lolos (PASS)     : ${passed}`);
  console.log(`❌ Gagal (FAIL)     : ${failed}`);

  if (failed === 0) {
    console.log("\n🎉 SEMUA TEST LOLOS 100%! BACKEND AMAN & SIAP DIGUNAKAN.");
  } else {
    console.error("\n⚠️ ADA TEST YANG GAGAL. CEK DETAIL LOG DI ATAS.");
  }

  server.close(() => {
    process.exit(failed === 0 ? 0 : 1);
  });
}

server = app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}...`);
  runTests();
});
