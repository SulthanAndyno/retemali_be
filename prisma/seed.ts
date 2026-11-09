import "dotenv/config";
import bcrypt from "bcrypt";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Seeding Taman Baca Rete Mali database...");

  const defaultPassword = await bcrypt.hash("Password123", 12);

  // 1. Seed Users (Admin, Volunteer, Member) sesuai UI Design
  const admin = await prisma.user.upsert({
    where: { email: "admin@retemali.id" },
    update: {},
    create: {
      memberCode: "RM-2024-001",
      name: "Koordinator Rete Mali",
      email: "admin@retemali.id",
      password: defaultPassword,
      phone: "081210000001",
      rtRw: "RT05/RW14",
      role: "ADMIN",
      status: "ACTIVE",
      points: 950,
    },
  });

  const volunteer = await prisma.user.upsert({
    where: { email: "relawan@retemali.id" },
    update: {},
    create: {
      memberCode: "RM-2024-012",
      name: "Bunga Lestari",
      email: "relawan@retemali.id",
      password: defaultPassword,
      phone: "081210000002",
      rtRw: "RT05/RW14",
      role: "VOLUNTEER",
      status: "ACTIVE",
      points: 620,
    },
  });

  const member = await prisma.user.upsert({
    where: { email: "rifky@retemali.id" },
    update: {},
    create: {
      memberCode: "RM-2024-089",
      name: "Rifky Darmawan",
      email: "rifky@retemali.id",
      password: defaultPassword,
      phone: "081210000089",
      rtRw: "RT05/RW14",
      role: "MEMBER",
      status: "ACTIVE",
      points: 420,
      readingTarget: 20,
    },
  });

  console.log("Seeded Users:", {
    admin: admin.email,
    volunteer: volunteer.email,
    member: member.email,
  });

  // 2. Seed Books sesuai Katalog UI Rete Mali
  const booksData = [
    {
      bookCode: "BK-PS-0899",
      isbn: "9786024812966",
      title: "Filosofi Teras",
      slug: "filosofi-teras",
      author: "Henry Manampiring",
      publisher: "Penerbit Buku Kompas",
      publishYear: 2018,
      category: "PSIKOLOGI" as const,
      synopsis:
        "Filsafat Yunani-Romawi Kuno untuk mental tangguh masa kini. Menjelaskan cara mengendalikan emosi negatif dengan Stoisisme.",
      shelfLocation: "Rak B-04",
      totalStock: 4,
      availableStock: 3,
      rating: 4.9,
      borrowCount: 48,
      status: "AVAILABLE" as const,
    },
    {
      bookCode: "BK-FS-0001",
      isbn: "9789793062792",
      title: "Laskar Pelangi",
      slug: "laskar-pelangi",
      author: "Andrea Hirata",
      publisher: "Bentang Pustaka",
      publishYear: 2005,
      category: "FIKSI_SASTRA" as const,
      synopsis:
        "Kisah perjuangan 10 anak Belitung dari keluarga miskin yang menempuh pendidikan di sekolah Muhammadiyah yang penuh keterbatasan.",
      shelfLocation: "Rak A-01",
      totalStock: 3,
      availableStock: 2,
      rating: 4.9,
      borrowCount: 64,
      status: "AVAILABLE" as const,
    },
    {
      bookCode: "BK-SJ-0412",
      isbn: "9789799731234",
      title: "Bumi Manusia",
      slug: "bumi-manusia",
      author: "Pramoedya Ananta Toer",
      publisher: "Lentera Dipantara",
      publishYear: 1980,
      category: "SEJARAH" as const,
      synopsis:
        "Kisah Minke, pemuda pribumi di era kolonial Hindia Belanda yang berjuang melawan ketidakadilan hukum melalui tulisan.",
      shelfLocation: "Rak C-02",
      totalStock: 2,
      availableStock: 1,
      rating: 5.0,
      borrowCount: 52,
      status: "AVAILABLE" as const,
    },
    {
      bookCode: "BK-FS-0775",
      isbn: "9786024246945",
      title: "Laut Bercerita",
      slug: "laut-bercerita",
      author: "Leila S. Chudori",
      publisher: "Kepustakaan Populer Gramedia",
      publishYear: 2017,
      category: "FIKSI_SASTRA" as const,
      synopsis:
        "Novel sejarah tentang persahabatan, keluarga, dan perjuangan aktivis mahasiswa Biru Laut pada masa menjelang Reformasi 1998.",
      shelfLocation: "Rak A-03",
      totalStock: 3,
      availableStock: 2,
      rating: 4.9,
      borrowCount: 45,
      status: "AVAILABLE" as const,
    },
    {
      bookCode: "BK-SF-0010",
      isbn: "9786024242244",
      title: "Kosmos",
      slug: "kosmos-carl-sagan",
      author: "Carl Sagan",
      publisher: "Kepustakaan Populer Gramedia",
      publishYear: 2016,
      category: "SAINS_FAKTA" as const,
      synopsis:
        "Penjelajahan ilmiah mengenai sejarah alam semesta, peradaban manusia, dan masa depan eksplorasi antariksa.",
      shelfLocation: "Rak D-01",
      totalStock: 2,
      availableStock: 2,
      rating: 5.0,
      borrowCount: 31,
      status: "AVAILABLE" as const,
    },
    {
      bookCode: "BK-EA-0015",
      isbn: "9786020332956",
      title: "Petualangan Rimba Si Kancil",
      slug: "petualangan-rimba-si-kancil",
      author: "Tariq Mahardika",
      publisher: "Pustaka Anak Nusantara",
      publishYear: 2023,
      category: "EDUKASI_ANAK" as const,
      synopsis:
        "Fabel bergambar interaktif tentang kecerdikan Si Kancil menjaga kelestarian hutan bersama sahabat-sahabatnya.",
      shelfLocation: "Rak E-02",
      totalStock: 5,
      availableStock: 4,
      rating: 4.8,
      borrowCount: 39,
      status: "AVAILABLE" as const,
    },
  ];

  for (const b of booksData) {
    await prisma.book.upsert({
      where: { bookCode: b.bookCode },
      update: {},
      create: b,
    });
  }

  // 3. Seed Community Events sesuai UI Agenda & Kegiatan
  const eventsData = [
    {
      title: "Festival Dongeng Nusantara & Panggung Boneka",
      slug: "festival-dongeng-nusantara-panggung-boneka",
      description:
        "Pementasan dongeng interaktif fabel nusantara untuk anak usia 4-10 tahun disertai kuis mewarnai cerita dan hadiah buku bergambar gratis.",
      category: "DONGENG" as const,
      facilitatorName: "Kak Dini & Tim Boneka Rete Mali",
      location: "Pendopo Terbuka Rete Mali",
      eventDate: new Date("2026-05-10"),
      startTime: "09:00",
      endTime: "11:30",
      quota: 45,
      registeredCount: 39,
      feeType: "FREE" as const,
      infaqAmount: 0,
      materialsNote: "Gratis Buku Gambar",
      isFeatured: true,
      status: "PUBLISHED" as const,
    },
    {
      title: "Kelas Membaca Kreatif & Storytelling Ceria",
      slug: "kelas-membaca-kreatif-storytelling-ceria",
      description:
        "Belajar membaca nyaring dan mengekspresikan cerita bagi anak-anak warga RT 05 / RW 14.",
      category: "ANAK" as const,
      facilitatorName: "Kak Nadia",
      location: "Saung Baca Rete Mali",
      eventDate: new Date("2026-05-11"),
      startTime: "08:30",
      endTime: "10:30",
      quota: 25,
      registeredCount: 17,
      feeType: "FREE" as const,
      infaqAmount: 0,
      materialsNote: "Sisa 8 Kuota",
      isFeatured: false,
      status: "PUBLISHED" as const,
    },
    {
      title: "Bedah Buku Filosofi Teras & Diskusi Terbuka",
      slug: "bedah-buku-filosofi-teras-diskusi-terbuka",
      description:
        "Diskusi santai bedah bab pilihan Filosofi Teras bersama warga dan komunitas literasi Jatirangga.",
      category: "KLUB_BUKU" as const,
      facilitatorName: "Mas Bagas (Fasilitator)",
      location: "Balai Warga Rete Mali",
      eventDate: new Date("2026-05-13"),
      startTime: "19:30",
      endTime: "21:30",
      quota: 15,
      registeredCount: 8,
      feeType: "INFAQ" as const,
      infaqAmount: 20000,
      materialsNote: "Infaq Operasional & Snack",
      isFeatured: false,
      status: "PUBLISHED" as const,
    },
  ];

  for (const ev of eventsData) {
    await prisma.communityEvent.upsert({
      where: { slug: ev.slug },
      update: {},
      create: ev,
    });
  }

  // 4. Seed Donation Campaign sesuai UI Dukungan & Donasi
  const existingCampaign = await prisma.donationCampaign.findFirst({
    where: { title: "Capaian Kuartal II 2026" },
  });

  if (!existingCampaign) {
    await prisma.donationCampaign.create({
      data: {
        title: "Capaian Kuartal II 2026",
        targetAmount: 30000000,
        collectedAmount: 24850000,
        isActive: true,
      },
    });
  }

  console.log("Seeding finished successfully.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
