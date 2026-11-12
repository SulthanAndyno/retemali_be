import type { NextRequest } from 'next/server';
import {
  bearerToken,
  endOfDayIso,
  jsonError,
  upstreamRequest,
} from '@/lib/serverUpstream';
import {
  buildAttendanceReport,
  formatDateId,
  formatDateTimeId,
  type ReportPeriod,
  type UpstreamAttendanceEvent,
} from '@/lib/reports';
import { buildXlsx, xlsxResponse, type XlsxCellValue } from '@/lib/xlsx';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface AttendanceUpstreamPayload {
  generatedAt: string;
  period: { from: string | null; to: string | null };
  events: UpstreamAttendanceEvent[];
}

function ticketStatusLabel(status: string): string {
  switch (status) {
    case 'CHECKED_IN':
      return 'Hadir';
    case 'CANCELLED':
      return 'Dibatalkan';
    default:
      return 'Terdaftar';
  }
}

function stamp(): string {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

/**
 * GET /api/reports/attendance/export
 * Streams the same attendance report as a real .xlsx workbook.
 */
export async function GET(request: NextRequest) {
  const token = bearerToken(request);
  if (!token) {
    return jsonError('Token autentikasi tidak ditemukan. Silakan masuk kembali.', 401);
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from') || null;
  const to = searchParams.get('to') || null;
  const eventId = searchParams.get('eventId') || null;

  const params = new URLSearchParams();
  if (from) params.set('from', from);
  const endOfDay = endOfDayIso(to);
  if (endOfDay) params.set('to', endOfDay);
  if (eventId) params.set('eventId', eventId);
  const query = params.toString();

  const upstream = await upstreamRequest<{ data: AttendanceUpstreamPayload }>(
    `/events/attendance${query ? `?${query}` : ''}`,
    { token }
  );

  if (!upstream.ok || !upstream.data?.data) {
    return jsonError(
      upstream.error ?? 'Gagal menyiapkan berkas laporan presensi.',
      upstream.status || 502
    );
  }

  const period: ReportPeriod = { from, to };
  const report = buildAttendanceReport(upstream.data.data.events ?? [], period);

  const infoRows: XlsxCellValue[][] = [
    ['LAPORAN PRESENSI KEGIATAN — TAMAN BACA RETE MALI'],
    ['RT 05 / RW 14 Jatirangga'],
    [],
    ['Dibuat pada', formatDateTimeId(report.generatedAt)],
    ['Periode laporan', `${formatDateId(period.from)} s.d. ${formatDateId(period.to)}`],
    ['Total kegiatan', report.totals.events],
    ['Total kuota peserta', report.totals.quota],
    ['Total pendaftar', report.totals.registered],
    ['Total kehadiran', report.totals.checkedIn],
    ['Total tidak hadir', report.totals.noShow],
    ['Total pembatalan', report.totals.cancelled],
    ['Tingkat kehadiran', `${report.totals.attendanceRate}%`],
    ['Kegiatan ditutup otomatis', report.totals.autoClosedEvents],
  ];

  const summaryRows: XlsxCellValue[][] = [
    [
      'No',
      'Judul Kegiatan',
      'Kategori',
      'Tanggal',
      'Jam',
      'Lokasi',
      'Fasilitator',
      'Kuota',
      'Terdaftar',
      'Hadir',
      'Tidak Hadir',
      'Dibatalkan',
      'Kehadiran (%)',
      'Status',
    ],
  ];

  report.events.forEach((event, index) => {
    summaryRows.push([
      index + 1,
      event.title,
      event.category,
      formatDateId(event.eventDate),
      `${event.startTime} - ${event.endTime}`,
      event.location,
      event.facilitatorName,
      event.quota,
      event.activeRegistered,
      event.checkedInCount,
      event.noShowCount,
      event.cancelledCount,
      event.attendanceRate,
      event.phaseLabel,
    ]);
  });

  if (report.events.length === 0) {
    summaryRows.push(['-', 'Belum ada kegiatan pada periode ini', '', '', '', '', '', '', '', '', '', '', '', '']);
  }

  const participantRows: XlsxCellValue[][] = [
    [
      'No',
      'Judul Kegiatan',
      'Tanggal Kegiatan',
      'Kode Tiket',
      'Kode Anggota',
      'Nama Peserta',
      'RT / RW',
      'Telepon',
      'Status Kehadiran',
      'Waktu Check-in',
      'Waktu Pendaftaran',
    ],
  ];

  let participantIndex = 0;
  report.events.forEach((event) => {
    event.participants.forEach((participant) => {
      participantIndex += 1;
      participantRows.push([
        participantIndex,
        event.title,
        formatDateId(event.eventDate),
        participant.ticketCode,
        participant.memberCode,
        participant.memberName,
        participant.memberRtRw ?? '-',
        participant.memberPhone ?? '-',
        ticketStatusLabel(participant.status),
        participant.checkedInAt ? formatDateTimeId(participant.checkedInAt) : '-',
        formatDateTimeId(participant.registeredAt),
      ]);
    });
  });

  if (participantIndex === 0) {
    participantRows.push([
      '-',
      'Belum ada peserta terdaftar pada periode ini',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ]);
  }

  const workbook = buildXlsx([
    {
      name: 'Info Laporan',
      headerRow: false,
      columns: [{ width: 30 }, { width: 46 }],
      rows: infoRows,
    },
    {
      name: 'Ringkasan Event',
      freezeHeader: true,
      autoFilter: true,
      columns: [
        { width: 5 },
        { width: 40 },
        { width: 14 },
        { width: 18 },
        { width: 12 },
        { width: 30 },
        { width: 26 },
        { width: 8 },
        { width: 10 },
        { width: 8 },
        { width: 12 },
        { width: 11 },
        { width: 14 },
        { width: 26 },
      ],
      rows: summaryRows,
    },
    {
      name: 'Presensi Peserta',
      freezeHeader: true,
      autoFilter: true,
      columns: [
        { width: 5 },
        { width: 40 },
        { width: 18 },
        { width: 20 },
        { width: 16 },
        { width: 26 },
        { width: 12 },
        { width: 18 },
        { width: 18 },
        { width: 22 },
        { width: 22 },
      ],
      rows: participantRows,
    },
  ]);

  return xlsxResponse(workbook, `laporan-presensi-${stamp()}.xlsx`);
}
