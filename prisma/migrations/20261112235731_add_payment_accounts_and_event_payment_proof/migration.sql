-- Migration: multiple toggleable donation payment channels + event payment proof
-- Applied to the Supabase Postgres instance referenced by DIRECT_URL.

-- CreateEnum
CREATE TYPE "PaymentAccountType" AS ENUM ('QRIS', 'BANK_TRANSFER');

-- AlterTable: paid-event registration proof of payment + admin verification
ALTER TABLE "EventRegistration"
  ADD COLUMN "paymentProofUrl" TEXT,
  ADD COLUMN "paymentStatus" "PaymentStatus",
  ADD COLUMN "paymentNote" TEXT,
  ADD COLUMN "verifiedById" TEXT,
  ADD COLUMN "verifiedAt" TIMESTAMP(3);

-- CreateTable: one row per toggleable payment channel
CREATE TABLE "PaymentAccount" (
    "id" TEXT NOT NULL,
    "type" "PaymentAccountType" NOT NULL,
    "providerName" TEXT NOT NULL,
    "accountNumber" TEXT,
    "accountName" TEXT,
    "qrisImageUrl" TEXT,
    "qrisNmid" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentAccount_pkey" PRIMARY KEY ("id")
);

-- Backfill the legacy single-row PaymentSetting into toggleable channels so the
-- public donation page keeps showing the accounts it showed before.
INSERT INTO "PaymentAccount"
  ("id", "type", "providerName", "accountNumber", "accountName", "qrisImageUrl", "qrisNmid", "isActive", "sortOrder", "createdAt", "updatedAt")
SELECT
  'pa-legacy-qris',
  'QRIS'::"PaymentAccountType",
  'QRIS Statis',
  NULL,
  'Yayasan Taman Baca Rete Mali',
  "qrisImageUrl",
  COALESCE("qrisNmid", 'ID1024389271649'),
  true,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "PaymentSetting"
WHERE "id" = 'default'
  AND NOT EXISTS (SELECT 1 FROM "PaymentAccount" WHERE "id" = 'pa-legacy-qris')
  AND COALESCE("qrisImageUrl", '') <> '';

INSERT INTO "PaymentAccount"
  ("id", "type", "providerName", "accountNumber", "accountName", "qrisImageUrl", "qrisNmid", "isActive", "sortOrder", "createdAt", "updatedAt")
SELECT
  'pa-legacy-mandiri',
  'BANK_TRANSFER'::"PaymentAccountType",
  'Bank Mandiri',
  "bankMandiri",
  "bankMandiriName",
  NULL,
  NULL,
  true,
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "PaymentSetting"
WHERE "id" = 'default'
  AND NOT EXISTS (SELECT 1 FROM "PaymentAccount" WHERE "id" = 'pa-legacy-mandiri')
  AND COALESCE("bankMandiri", '') <> '';

INSERT INTO "PaymentAccount"
  ("id", "type", "providerName", "accountNumber", "accountName", "qrisImageUrl", "qrisNmid", "isActive", "sortOrder", "createdAt", "updatedAt")
SELECT
  'pa-legacy-bca',
  'BANK_TRANSFER'::"PaymentAccountType",
  'Bank BCA',
  "bankBca",
  "bankBcaName",
  NULL,
  NULL,
  true,
  2,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "PaymentSetting"
WHERE "id" = 'default'
  AND NOT EXISTS (SELECT 1 FROM "PaymentAccount" WHERE "id" = 'pa-legacy-bca')
  AND COALESCE("bankBca", '') <> '';
