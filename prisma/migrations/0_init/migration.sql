-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MEMBER', 'VOLUNTEER', 'DONOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'PENDING', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "BookCategory" AS ENUM ('FIKSI_SASTRA', 'SAINS_FAKTA', 'SEJARAH', 'PSIKOLOGI', 'EDUKASI_ANAK', 'ENSIKLOPEDIA', 'KOMIK_EDUKASI');

-- CreateEnum
CREATE TYPE "BookStatus" AS ENUM ('AVAILABLE', 'BORROWED', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('READY_FOR_PICKUP', 'CLAIMED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('BORROWED', 'RETURNED', 'OVERDUE', 'LOST');

-- CreateEnum
CREATE TYPE "BookCondition" AS ENUM ('GOOD', 'MINOR_DAMAGE', 'MAJOR_DAMAGE', 'LOST');

-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('ANAK', 'SAINS', 'KLUB_BUKU', 'MENULIS', 'DONGENG', 'UMUM');

-- CreateEnum
CREATE TYPE "EventFeeType" AS ENUM ('FREE', 'INFAQ');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ONGOING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('REGISTERED', 'CHECKED_IN', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VolunteerApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('SHIFT_PAGI', 'SHIFT_SIANG', 'SHIFT_SORE', 'SHIFT_MALAM');

-- CreateEnum
CREATE TYPE "ShiftApprovalStatus" AS ENUM ('ONGOING', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('QRIS', 'BANK_MANDIRI', 'BANK_BCA', 'GOPAY', 'OVO', 'DANA', 'SHOPEEPAY');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED');

-- CreateEnum
CREATE TYPE "BookDonationDeliveryMethod" AS ENUM ('DROP_OFF', 'COURIER');

-- CreateEnum
CREATE TYPE "BookDonationStatus" AS ENUM ('PENDING_CURATION', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "memberCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phone" TEXT,
    "rtRw" TEXT,
    "avatar" TEXT,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "points" INTEGER NOT NULL DEFAULT 0,
    "readingTarget" INTEGER NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL,
    "bookCode" TEXT NOT NULL,
    "isbn" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "publisher" TEXT,
    "publishYear" INTEGER,
    "category" "BookCategory" NOT NULL,
    "synopsis" TEXT,
    "coverImage" TEXT,
    "shelfLocation" TEXT NOT NULL,
    "totalStock" INTEGER NOT NULL DEFAULT 1,
    "availableStock" INTEGER NOT NULL DEFAULT 1,
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 5.0,
    "borrowCount" INTEGER NOT NULL DEFAULT 0,
    "status" "BookStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookBookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookReservation" (
    "id" TEXT NOT NULL,
    "reservationCode" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "pickupCounter" TEXT NOT NULL DEFAULT 'Loket Sirkulasi A-2',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'READY_FOR_PICKUP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookLoan" (
    "id" TEXT NOT NULL,
    "loanCode" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "reservationId" TEXT,
    "processedById" TEXT,
    "returnedById" TEXT,
    "borrowedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "returnedAt" TIMESTAMP(3),
    "extendedCount" INTEGER NOT NULL DEFAULT 0,
    "returnCondition" "BookCondition",
    "fineAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "reminderSentAt" TIMESTAMP(3),
    "status" "LoanStatus" NOT NULL DEFAULT 'BORROWED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookLoan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "EventCategory" NOT NULL,
    "facilitatorName" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT 'Saung Baca Rete Mali, Jatirangga',
    "eventDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "quota" INTEGER NOT NULL,
    "registeredCount" INTEGER NOT NULL DEFAULT 0,
    "feeType" "EventFeeType" NOT NULL DEFAULT 'FREE',
    "infaqAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "materialsNote" TEXT,
    "bannerImage" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "status" "EventStatus" NOT NULL DEFAULT 'PUBLISHED',
    "reportSummary" TEXT,
    "reportApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventRegistration" (
    "id" TEXT NOT NULL,
    "ticketCode" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "checkedInAt" TIMESTAMP(3),
    "checkedInBy" TEXT,
    "status" "TicketStatus" NOT NULL DEFAULT 'REGISTERED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VolunteerApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "majorOrJob" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "division" TEXT NOT NULL,
    "motivation" TEXT NOT NULL,
    "cvDocument" TEXT,
    "status" "VolunteerApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VolunteerApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VolunteerShift" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shiftType" "ShiftType" NOT NULL,
    "location" TEXT NOT NULL DEFAULT 'RT 05 RW 14 Jatirangga • Pos Utama',
    "taskSummary" TEXT,
    "clockInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clockOutAt" TIMESTAMP(3),
    "durationHours" DECIMAL(5,2),
    "approvalStatus" "ShiftApprovalStatus" NOT NULL DEFAULT 'ONGOING',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VolunteerShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftHandoverNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shiftType" "ShiftType" NOT NULL,
    "tags" TEXT[],
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShiftHandoverNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DonationCampaign" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "targetAmount" DECIMAL(14,2) NOT NULL,
    "collectedAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "auditReportPdf" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DonationCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialDonation" (
    "id" TEXT NOT NULL,
    "receiptCode" TEXT NOT NULL,
    "campaignId" TEXT,
    "userId" TEXT,
    "donorName" TEXT NOT NULL,
    "donorEmail" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "amount" DECIMAL(14,2) NOT NULL,
    "purposeLabel" TEXT,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "proofImage" TEXT,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialDonation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhysicalBookDonation" (
    "id" TEXT NOT NULL,
    "batchCode" TEXT NOT NULL,
    "userId" TEXT,
    "donorName" TEXT NOT NULL,
    "donorBadge" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "packageTitle" TEXT NOT NULL,
    "totalBooks" INTEGER NOT NULL,
    "conditionNote" TEXT NOT NULL,
    "conditionImage" TEXT,
    "deliveryMethod" "BookDonationDeliveryMethod" NOT NULL DEFAULT 'DROP_OFF',
    "status" "BookDonationStatus" NOT NULL DEFAULT 'PENDING_CURATION',
    "curatedById" TEXT,
    "curatedAt" TIMESTAMP(3),
    "curationNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhysicalBookDonation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentSetting" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "bankMandiri" TEXT NOT NULL DEFAULT '1234567890',
    "bankMandiriName" TEXT NOT NULL DEFAULT 'Yayasan Taman Baca Rete Mali',
    "bankBca" TEXT NOT NULL DEFAULT '0987654321',
    "bankBcaName" TEXT NOT NULL DEFAULT 'Yayasan Taman Baca Rete Mali',
    "qrisImageUrl" TEXT,
    "qrisNmid" TEXT DEFAULT 'ID1024389271649',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_memberCode_key" ON "User"("memberCode");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Book_bookCode_key" ON "Book"("bookCode");

-- CreateIndex
CREATE UNIQUE INDEX "Book_isbn_key" ON "Book"("isbn");

-- CreateIndex
CREATE UNIQUE INDEX "Book_slug_key" ON "Book"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "BookBookmark_userId_bookId_key" ON "BookBookmark"("userId", "bookId");

-- CreateIndex
CREATE UNIQUE INDEX "BookReservation_reservationCode_key" ON "BookReservation"("reservationCode");

-- CreateIndex
CREATE UNIQUE INDEX "BookLoan_loanCode_key" ON "BookLoan"("loanCode");

-- CreateIndex
CREATE UNIQUE INDEX "BookLoan_reservationId_key" ON "BookLoan"("reservationId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityEvent_slug_key" ON "CommunityEvent"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "EventRegistration_ticketCode_key" ON "EventRegistration"("ticketCode");

-- CreateIndex
CREATE UNIQUE INDEX "EventRegistration_eventId_userId_key" ON "EventRegistration"("eventId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "VolunteerApplication_userId_key" ON "VolunteerApplication"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialDonation_receiptCode_key" ON "FinancialDonation"("receiptCode");

-- CreateIndex
CREATE UNIQUE INDEX "PhysicalBookDonation_batchCode_key" ON "PhysicalBookDonation"("batchCode");

-- AddForeignKey
ALTER TABLE "BookBookmark" ADD CONSTRAINT "BookBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookBookmark" ADD CONSTRAINT "BookBookmark_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookReservation" ADD CONSTRAINT "BookReservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookReservation" ADD CONSTRAINT "BookReservation_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookLoan" ADD CONSTRAINT "BookLoan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookLoan" ADD CONSTRAINT "BookLoan_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookLoan" ADD CONSTRAINT "BookLoan_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "BookReservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CommunityEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VolunteerApplication" ADD CONSTRAINT "VolunteerApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VolunteerShift" ADD CONSTRAINT "VolunteerShift_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftHandoverNote" ADD CONSTRAINT "ShiftHandoverNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialDonation" ADD CONSTRAINT "FinancialDonation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "DonationCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialDonation" ADD CONSTRAINT "FinancialDonation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalBookDonation" ADD CONSTRAINT "PhysicalBookDonation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

