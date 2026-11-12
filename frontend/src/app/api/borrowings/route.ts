import type { NextRequest } from 'next/server';
import { bearerToken, jsonError, jsonOk, upstreamRequest } from '@/lib/serverUpstream';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface UpstreamLoan {
  id: string;
  loanCode: string;
  borrowedAt: string;
  dueDate: string;
  returnedAt: string | null;
  extendedCount: number;
  fineAmount: string | number | null;
  status: string;
  notes: string | null;
  user?: {
    id: string;
    memberCode: string;
    name: string;
    phone?: string | null;
    rtRw?: string | null;
  } | null;
  book?: {
    id: string;
    title: string;
    bookCode: string;
    coverImage?: string | null;
    author?: string | null;
  } | null;
}

interface UpstreamMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

/**
 * GET /api/borrowings
 * Administrative log of book loans (who borrowed what, when it is due).
 */
export async function GET(request: NextRequest) {
  const token = bearerToken(request);
  if (!token) {
    return jsonError('Token autentikasi tidak ditemukan. Silakan masuk kembali.', 401);
  }

  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page') ?? '1';
  const limit = searchParams.get('limit') ?? '20';
  const status = searchParams.get('status');
  const search = searchParams.get('search');

  const params = new URLSearchParams({ page, limit });
  if (status && status !== 'ALL') params.set('status', status);
  if (search && search.trim()) params.set('search', search.trim());

  const upstream = await upstreamRequest<{ data: UpstreamLoan[]; meta: UpstreamMeta }>(
    `/circulation/loans?${params.toString()}`,
    { token }
  );

  if (!upstream.ok) {
    return jsonError(
      upstream.error ?? 'Gagal memuat log peminjaman buku.',
      upstream.status || 502
    );
  }

  const now = Date.now();

  const rows = (upstream.data?.data ?? []).map((loan) => {
    const due = new Date(loan.dueDate);
    const dueTime = Number.isNaN(due.getTime()) ? null : due.getTime();
    const isReturned = loan.status === 'RETURNED';
    const overdueDays =
      !isReturned && dueTime !== null
        ? Math.max(0, Math.floor((now - dueTime) / DAY_MS))
        : 0;
    const daysUntilDue =
      !isReturned && dueTime !== null
        ? Math.max(0, Math.ceil((dueTime - now) / DAY_MS))
        : 0;

    return {
      id: loan.id,
      loanCode: loan.loanCode,
      status: loan.status,
      borrowedAt: loan.borrowedAt,
      dueDate: loan.dueDate,
      returnedAt: loan.returnedAt,
      extendedCount: loan.extendedCount ?? 0,
      fineAmount: toNumber(loan.fineAmount),
      notes: loan.notes,
      overdueDays,
      daysUntilDue,
      isOverdue: !isReturned && overdueDays > 0,
      member: {
        id: loan.user?.id ?? '',
        memberCode: loan.user?.memberCode ?? '-',
        name: loan.user?.name ?? 'Anggota',
        phone: loan.user?.phone ?? null,
        rtRw: loan.user?.rtRw ?? null,
      },
      book: {
        id: loan.book?.id ?? '',
        bookCode: loan.book?.bookCode ?? '-',
        title: loan.book?.title ?? 'Buku',
        author: loan.book?.author ?? null,
        coverImage: loan.book?.coverImage ?? null,
      },
    };
  });

  const pageSummary = rows.reduce(
    (acc, row) => {
      acc.total += 1;
      if (row.status === 'RETURNED') acc.returned += 1;
      else if (row.isOverdue) acc.overdue += 1;
      else acc.active += 1;
      acc.fines += row.fineAmount;
      return acc;
    },
    { total: 0, active: 0, overdue: 0, returned: 0, fines: 0 }
  );

  return jsonOk({
    rows,
    meta: upstream.data?.meta ?? {
      total: rows.length,
      page: Number(page),
      limit: Number(limit),
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    },
    pageSummary,
    fetchedAt: new Date().toISOString(),
  });
}
