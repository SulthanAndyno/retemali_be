-- Migration: generic BANK_TRANSFER payment method for dynamically configured
-- bank accounts (any bank beyond the two legacy hard-coded ones).
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'BANK_TRANSFER';
