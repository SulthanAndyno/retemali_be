'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { post, get } from '@/lib/api';

export interface User {
  id: string;
  memberCode: string;
  name: string;
  email: string;
  phone?: string;
  rtRw?: string;
  avatar?: string;
  role: 'MEMBER' | 'VOLUNTEER' | 'DONOR' | 'ADMIN';
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  points: number;
  readingTarget: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'retemali_token';

interface LoginResponse {
  data: {
    token: string;
    user: User;
  };
  message: string;
  status: string;
}

interface MeResponse {
  data: User;
  message: string;
  status: string;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (!storedToken) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }

    try {
      const response = await get<MeResponse>('/auth/me');
      setUser(response.data);
      setToken(storedToken);
    } catch {
      // Token invalid or expired
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // On mount, check for existing token
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await post<LoginResponse>('/auth/login', { email, password });
      const { token: newToken, user: newUser } = response.data;

      localStorage.setItem(TOKEN_KEY, newToken);
      setToken(newToken);
      setUser(newUser);
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
