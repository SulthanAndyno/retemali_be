import type { NextRequest } from 'next/server';
import { bearerToken, jsonError } from '@/lib/serverUpstream';
import { loadCashReport } from '@/lib/cashReportServer';
import { formatDateId, formatDateTimeId } from '@/lib/reports';
import { buildXlsx, xlsxResponse, type XlsxCellValue } from '@/lib/xlsx';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function stamp(): string {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

/**
 * GET /api/reports/cash/export
 * Excel (.xlsx) export of the cash report.
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
    return jsonError(result.error ?? 'Gagal menyiapkan berkas laporan kas.', result.status || 502);
  }

  const report = result.report;

  const infoRows: XlsxCellValue[][] = [
    ['LAPORAN KAS — TAMAN BACA RETE MALI'],
    ['RT 05 / RW 14 Jatirangga'],
    [],
    ['Dibuat pada', formatDateTimeId(report.generatedAt)],
    ['Periode laporan', `${formatDateId(period.from)} s.d. ${formatDateId(period.to)}`],
    [],
    ['RINGKASAN', ''],
    ['Total arus kas masuk', report.summary.totalIncome],
    ['Total pengeluaran', report.summary.totalExpense],
    ['Arus kas bersih', report.summary.netCashFlow],
    ['Donasi finansial terverifikasi', report.summary.donationIncome],
    ['Infaq kegiatan', report.summary.eventInfaqIncome],
    ['Denda sirkulasi', report.summary.fineIncome],
    ['Jumlah transaksi', report.summary.transactionCount],
    [],
    ['CATATAN', report.expenseTracking.reason],
  ];

  const summaryRows: XlsxCellValue[][] = [
    ['Kategori', 'Jumlah Transaksi', 'Nominal (Rp)'],
    ...report.byCategory.map((row) => [row.label, row.count, row.amount]),
    ['TOTAL', report.summary.transactionCount, report.summary.totalIncome],
  ];

  const methodRows: XlsxCellValue[][] = [
    ['Metode Pembayaran', 'Jumlah Transaksi', 'Nominal (Rp)'],
    ...report.byMethod.map((row) => [row.method, row.count, row.amount]),
  ];

  const monthRows: XlsxCellValue[][] = [
    ['Bulan', 'Arus Kas Masuk (Rp)'],
    ...report.byMonth.map((row) => [row.label, row.income]),
  ];

  const entryRows: XlsxCellValue[][] = [
    [
      'No',
      'Tanggal',
      'Kategori',
      'Keterangan',
      'Metode',
      'Referensi',
      'Status',
      'Nominal (Rp)',
    ],
    ...report.entries.map((entry, index) => [
      index + 1,
      formatDateId(entry.date),
      entry.categoryLabel,
      entry.label,
      entry.method,
      entry.reference,
      entry.status,
      entry.amount,
    ]),
  ];

  if (report.entries.length === 0) {
    entryRows.push(['-', '-', '-', 'Tidak ada transaksi pada periode ini', '-', '-', '-', 0]);
  }

  const workbook = buildXlsx([
    {
      name: 'Info Laporan',
      headerRow: false,
      columns: [{ width: 34 }, { width: 60 }],
      rows: infoRows,
    },
    {
      name: 'Ringkasan Kategori',
      freezeHeader: true,
      columns: [{ width: 28 }, { width: 18 }, { width: 20 }],
      rows: summaryRows,
    },
    {
      name: 'Per Metode',
      freezeHeader: true,
      columns: [{ width: 28 }, { width: 18 }, { width: 20 }],
      rows: methodRows,
    },
    {
      name: 'Per Bulan',
      freezeHeader: true,
      columns: [{ width: 22 }, { width: 22 }],
      rows: monthRows,
    },
    {
      name: 'Rincian Transaksi',
      freezeHeader: true,
      autoFilter: true,
      columns: [
        { width: 5 },
        { width: 18 },
        { width: 20 },
        { width: 52 },
        { width: 18 },
        { width: 18 },
        { width: 14 },
        { width: 18 },
      ],
      rows: entryRows,
    },
  ]);

  return xlsxResponse(workbook, `laporan-kas-${stamp()}.xlsx`);
}
