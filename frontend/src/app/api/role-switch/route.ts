import type { NextRequest } from 'next/server';
import { bearerToken, jsonError, jsonOk, upstreamRequest } from '@/lib/serverUpstream';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type SwitchableRole = 'MEMBER' | 'VOLUNTEER';

const CAPABILITIES: Record<SwitchableRole, Record<string, boolean>> = {
  MEMBER: {
    canBrowseCatalog: true,
    canRegisterEvents: true,
    canAccessVolunteerWorkspace: false,
    canClockIn: false,
    canScanTickets: false,
    canCurateDonations: false,
  },
  VOLUNTEER: {
    canBrowseCatalog: true,
    canRegisterEvents: true,
    canAccessVolunteerWorkspace: true,
    canClockIn: true,
    canScanTickets: true,
    canCurateDonations: true,
  },
};

interface RoleSwitchBody {
  role?: string;
}

/**
 * POST /api/role-switch
 *
 * Validates a volunteer-role switch. The switch itself lives in client state
 * (RoleContext), but the caller's role is read from the database through the
 * authenticated `/auth/me` endpoint — the client can no longer claim a role.
 * Only accounts that actually hold the VOLUNTEER role may switch; admins and
 * unapproved members are rejected with 403.
 */
export async function POST(request: NextRequest) {
  const token = bearerToken(request);
  if (!token) {
    return jsonError('Sesi tidak ditemukan. Silakan masuk kembali.', 401);
  }

  const session = await upstreamRequest<{ data?: { role?: string } }>('/auth/me', { token });
  if (!session.ok || !session.data?.data) {
    return jsonError(
      session.error ?? 'Gagal memverifikasi sesi Anda. Silakan masuk kembali.',
      session.status === 401 ? 401 : 502
    );
  }

  const accountRole = (session.data.data.role ?? '').toUpperCase();
  if (accountRole !== 'VOLUNTEER') {
    return jsonError(
      'Mode relawan hanya tersedia untuk akun dengan peran Relawan yang sudah disetujui admin.',
      403
    );
  }

  let body: RoleSwitchBody | null = null;
  try {
    body = (await request.json()) as RoleSwitchBody;
  } catch {
    return jsonError('Body permintaan tidak valid (JSON diperlukan).', 400);
  }

  const requested = (body?.role ?? '').toUpperCase();
  if (requested !== 'MEMBER' && requested !== 'VOLUNTEER') {
    return jsonError(
      'Peran tujuan tidak valid. Pilihan yang tersedia: MEMBER atau VOLUNTEER.',
      400
    );
  }

  const role: SwitchableRole = requested;

  return jsonOk({
    activeRole: role,
    accountRole,
    mode: role === accountRole ? 'ACCOUNT' : 'SWITCHED',
    persisted: false,
    capabilities: CAPABILITIES[role],
    note:
      role === 'VOLUNTEER'
        ? 'Mode Relawan aktif untuk sesi ini.'
        : 'Kembali ke mode Anggota. Akses relawan dinonaktifkan pada sesi ini.',
  });
}
