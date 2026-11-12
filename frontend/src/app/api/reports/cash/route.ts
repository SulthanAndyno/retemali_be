import type { NextRequest } from 'next/server';
import { bearerToken, jsonError, jsonOk } from '@/lib/serverUpstream';
import { loadCashReport } from '@/lib/cashReportServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/reports/cash
 * Financial / cash report for the selected period (income side + breakdowns).
 */
export async function GET(request: NextRequest) {
  const token = bearerToken(request);
  if (!token) {
    return jsonError('Token autentikasi tidak ditemukan. Silakan masuk kembali.', 401);
  }

  const { searchParams } = new URL(request.url);
  const period = {
    from: searchParams.get('from') || null,
    to: searchParams.get('to') || null,
  };

  const result = await loadCashReport(token, period);
  if (!result.ok || !result.report) {
    return jsonError(result.error ?? 'Gagal memuat laporan kas.', result.status || 502);
  }

  return jsonOk(result.report);
}
