/**
 * WhatsApp helpers — every outbound chat link in the app is built here so the
 * wa.me format stays consistent (international format, digits only).
 */

export const DEFAULT_WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '6281234567890';

/**
 * Normalises an Indonesian phone number into wa.me digits (62…).
 * Accepts "0812-3456-789", "+62 812 3456 789", "62812…", "812…".
 */
export function normalizeWhatsAppNumber(input?: string | null): string | null {
  if (!input) return null;
  const digits = input.replace(/[^\d]/g, '');
  if (!digits) return null;
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('8')) return `62${digits}`;
  return digits;
}

export interface WhatsAppLinkOptions {
  /** Recipient number; falls back to the community default when empty. */
  phone?: string | null;
  message?: string;
}

/**
 * Builds a direct `https://wa.me/<number>?text=<message>` link.
 */
export function buildWhatsAppLink({ phone, message }: WhatsAppLinkOptions = {}): string {
  const target =
    normalizeWhatsAppNumber(phone) ??
    normalizeWhatsAppNumber(DEFAULT_WHATSAPP_NUMBER) ??
    DEFAULT_WHATSAPP_NUMBER;
  const query = message && message.trim() ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${target}${query}`;
}

/** Default copy used by the "contact the library" buttons. */
export const WHATSAPP_TEMPLATES = {
  general:
    'Halo Admin Rete Mali, saya ingin bertanya mengenai layanan Taman Baca & Komunitas RT 05 / RW 14.',
  loanReminder: (params: { name: string; bookTitle: string; dueDate: string; daysLate: number }) =>
    `Halo ${params.name}, pengingat dari Taman Baca Rete Mali: buku "${params.bookTitle}" telah melewati jatuh tempo (${params.dueDate}) selama ${params.daysLate} hari. Mohon segera dikembalikan. Terima kasih.`,
  eventInfo: (params: { title: string }) =>
    `Halo Admin Rete Mali, saya ingin menanyakan detail kegiatan "${params.title}".`,
  volunteerCoordination:
    'Halo Koordinator Relawan Rete Mali, saya ingin berkoordinasi mengenai jadwal piket hari ini.',
};
