const UPLOADS_URL = process.env.NEXT_PUBLIC_UPLOADS_URL || 'http://localhost:5000/uploads';

/**
 * Format a date to Indonesian locale string.
 */
export function formatDate(date: string | Date, locale = 'id-ID'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format a number as Indonesian Rupiah currency.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Prepend the uploads base URL to a relative path, or return a placeholder.
 */
export function getImageUrl(path: string | null | undefined): string {
  if (!path) return '/placeholder-image.png';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${UPLOADS_URL}/${path.replace(/^\/+/, '')}`;
}

/**
 * Truncate a string to a maximum length, appending ellipsis if needed.
 */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length).trimEnd() + '…';
}

/**
 * Merge CSS class names (simple implementation; install clsx for advanced usage).
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Map BookCategory enum values to Indonesian labels.
 */
export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    FICTION: 'Fiksi',
    NON_FICTION: 'Non-Fiksi',
    CHILDREN: 'Anak-anak',
    TEEN: 'Remaja',
    SCIENCE: 'Sains',
    HISTORY: 'Sejarah',
    RELIGION: 'Agama',
    BIOGRAPHY: 'Biografi',
    HEALTH: 'Kesehatan',
    EDUCATION: 'Pendidikan',
    TECHNOLOGY: 'Teknologi',
    ART: 'Seni & Budaya',
    COMIC: 'Komik',
    MAGAZINE: 'Majalah',
    OTHER: 'Lainnya',
  };
  return labels[category] ?? category;
}

/**
 * Return Tailwind badge color classes for a given status string.
 */
export function getStatusBadgeColor(status: string): string {
  const colors: Record<string, string> = {
    // Loan / borrow statuses
    ACTIVE: 'badge-blue',
    BORROWED: 'badge-blue',
    RETURNED: 'badge-green',
    OVERDUE: 'badge-red',
    LOST: 'badge-red',

    // User statuses
    PENDING: 'badge-yellow',
    SUSPENDED: 'badge-red',

    // Book availability
    AVAILABLE: 'badge-green',
    UNAVAILABLE: 'badge-gray',
    DAMAGED: 'badge-red',

    // Event / activity statuses
    UPCOMING: 'badge-blue',
    ONGOING: 'badge-green',
    COMPLETED: 'badge-gray',
    CANCELLED: 'badge-red',

    // Donation statuses
    CONFIRMED: 'badge-green',
    REJECTED: 'badge-red',
  };
  return colors[status] ?? 'badge-gray';
}
