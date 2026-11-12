import { upstreamRequest, endOfDayIso } from './serverUpstream';
import {
  buildCashReport,
  type CashReport,
  type ReportPeriod,
  type UpstreamCashEvent,
  type UpstreamFinancialDonation,
  type UpstreamLoanFine,
} from './reports';

interface PaginatedResponse<T> {
  data: T[];
  meta?: unknown;
}

export interface CashReportLoadResult {
  ok: boolean;
  status: number;
  error: string | null;
  report: CashReport | null;
}

/**
 * Loads and aggregates the cash report from the three existing data sources.
 * Only the financial-donation ledger is mandatory; events and loans degrade
 * gracefully so a partial outage never blanks the whole report.
 */
export async function loadCashReport(
  token: string,
  period: ReportPeriod
): Promise<CashReportLoadResult> {
  const donationParams = new URLSearchParams({ status: 'VERIFIED', limit: '100' });
  if (period.from) donationParams.set('from', period.from);
  const endOfDay = endOfDayIso(period.to);
  if (endOfDay) donationParams.set('to', endOfDay);

  const [donationsResult, eventsResult, loansResult] = await Promise.all([
    upstreamRequest<PaginatedResponse<UpstreamFinancialDonation>>(
      `/donations/financial?${donationParams.toString()}`,
      { token }
    ),
    upstreamRequest<PaginatedResponse<UpstreamCashEvent>>('/events?limit=100', { token }),
    upstreamRequest<PaginatedResponse<UpstreamLoanFine>>('/circulation/loans?limit=100', {
      token,
    }),
  ]);

  if (!donationsResult.ok) {
    return {
      ok: false,
      status: donationsResult.status || 502,
      error: donationsResult.error ?? 'Gagal memuat data donasi finansial.',
      report: null,
    };
  }

  const report = buildCashReport({
    donations: donationsResult.data?.data ?? [],
    events: eventsResult.ok ? (eventsResult.data?.data ?? []) : [],
    loans: loansResult.ok ? (loansResult.data?.data ?? []) : [],
    period,
    sources: {
      donations: true,
      events: eventsResult.ok,
      loans: loansResult.ok,
    },
  });

  return { ok: true, status: 200, error: null, report };
}
