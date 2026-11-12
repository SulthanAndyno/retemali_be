'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';

export type ActiveRole = 'MEMBER' | 'VOLUNTEER' | 'ADMIN';
export type SwitchableRole = 'MEMBER' | 'VOLUNTEER';
export type RoleMode = 'ACCOUNT' | 'PREVIEW' | 'SWITCHED';

export interface RoleSwitchResult {
  activeRole: ActiveRole;
  mode: RoleMode;
  persisted: boolean;
  note: string;
}

interface RoleContextValue {
  activeRole: ActiveRole;
  accountRole: ActiveRole | null;
  mode: RoleMode;
  isVolunteerMode: boolean;
  canSwitchVolunteer: boolean;
  switching: boolean;
  note: string | null;
  switchRole: (role: SwitchableRole) => Promise<RoleSwitchResult | null>;
  resetToAccountRole: () => void;
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

const STORAGE_KEY = 'retemali_active_role';

/**
 * Client-side "active role" for the volunteer switch.
 *
 * The account's real role lives in the database and is enforced by the API;
 * this context only decides which workspace the UI presents. Only accounts
 * that actually hold the VOLUNTEER role may switch modes — admins and regular
 * members never get the toggle (see `canSwitchVolunteer`).
 */
export function RoleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [preferred, setPreferred] = useState<SwitchableRole | null>(null);
  const [switching, setSwitching] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const accountRole = (user?.role ?? null) as ActiveRole | null;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'MEMBER' || stored === 'VOLUNTEER') {
      setPreferred(stored);
    }
  }, []);

  // Drop any stale stored preference when the account is not a volunteer.
  useEffect(() => {
    if (accountRole && accountRole !== 'VOLUNTEER' && preferred) {
      setPreferred(null);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [accountRole, preferred]);

  const activeRole = useMemo<ActiveRole>(() => {
    if (!accountRole) return 'MEMBER';
    // Only VOLUNTEER accounts can present the member view; everyone else keeps
    // their database role.
    if (accountRole === 'VOLUNTEER') {
      return preferred === 'MEMBER' ? 'MEMBER' : 'VOLUNTEER';
    }
    return accountRole;
  }, [accountRole, preferred]);

  const mode = useMemo<RoleMode>(() => {
    if (!accountRole || activeRole === accountRole) return 'ACCOUNT';
    return 'SWITCHED';
  }, [accountRole, activeRole]);

  const canSwitchVolunteer = accountRole === 'VOLUNTEER';

  const switchRole = useCallback(
    async (role: SwitchableRole): Promise<RoleSwitchResult | null> => {
      if (!canSwitchVolunteer) {
        throw new Error('Mode relawan hanya tersedia untuk akun dengan peran Relawan.');
      }
      setSwitching(true);
      try {
        const token =
          typeof window !== 'undefined' ? window.localStorage.getItem('retemali_token') : null;

        const response = await fetch('/api/role-switch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ role }),
        });

        const payload = (await response.json().catch(() => null)) as
          | { status?: string; message?: string; data?: RoleSwitchResult }
          | null;

        if (!response.ok || !payload?.data) {
          throw new Error(payload?.message ?? 'Gagal mengganti peran.');
        }

        setPreferred(role);
        setNote(payload.data.note);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEY, role);
        }
        return payload.data;
      } finally {
        setSwitching(false);
      }
    },
    [canSwitchVolunteer]
  );

  const resetToAccountRole = useCallback(() => {
    setPreferred(null);
    setNote(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const value: RoleContextValue = {
    activeRole,
    accountRole,
    mode,
    isVolunteerMode: activeRole === 'VOLUNTEER',
    canSwitchVolunteer,
    switching,
    note,
    switchRole,
    resetToAccountRole,
  };

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
