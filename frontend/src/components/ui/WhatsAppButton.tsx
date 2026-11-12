'use client';

import { MessageCircle } from 'lucide-react';
import { buildWhatsAppLink } from '@/lib/whatsapp';

interface WhatsAppButtonProps {
  /** Recipient phone in any local/international format. Falls back to the community number. */
  phone?: string | null;
  message?: string;
  label?: string;
  variant?: 'solid' | 'outline' | 'subtle';
  size?: 'sm' | 'md';
  className?: string;
  showIcon?: boolean;
  ariaLabel?: string;
}

const VARIANT_CLASSES: Record<NonNullable<WhatsAppButtonProps['variant']>, string> = {
  solid: 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-xs',
  outline:
    'bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-50 active:bg-emerald-100',
  subtle: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:bg-emerald-200',
};

const SIZE_CLASSES: Record<NonNullable<WhatsAppButtonProps['size']>, string> = {
  sm: 'px-3 py-1.5 text-[11px] gap-1',
  md: 'px-4 py-2.5 text-xs gap-1.5',
};

/**
 * Direct WhatsApp deep link (`https://wa.me/<number>?text=...`).
 * Always rendered as an anchor so the browser handles the redirect natively.
 */
export default function WhatsAppButton({
  phone,
  message,
  label = 'Chat WhatsApp',
  variant = 'solid',
  size = 'md',
  className,
  showIcon = true,
  ariaLabel,
}: WhatsAppButtonProps) {
  const href = buildWhatsAppLink({ phone, message });

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel ?? label}
      title={`${label} • ${href}`}
      className={`inline-flex items-center justify-center rounded-xl font-bold transition-colors ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className ?? ''}`}
    >
      {showIcon && <MessageCircle size={size === 'sm' ? 12 : 14} />}
      <span>{label}</span>
    </a>
  );
}
